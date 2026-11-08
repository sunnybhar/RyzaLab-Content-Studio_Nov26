import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { saveBoundedWorkflowSetup } from "../lib/studio/bounded-workflow-setup";
import { applyCommand } from "../lib/studio/engine";
let state = initialState(DEMO_ACTOR, true);
state.settings.qualifiedRates = [];
state.settings.monthlyCap = 500;
state.settings.requestCap = 50;
state.settings.confirmationThreshold = 50;
state.connections.push({
  id: "source-fixture-writer",
  title: "Fixture writer",
  provider: "anthropic",
  function: "text",
  model: "claude-sonnet-5-5",
  hasKey: true,
  status: "validated",
  updatedAt: "2026-11-07T12:00:00Z",
});
state = saveBoundedWorkflowSetup(
  state,
  DEMO_ACTOR,
  {
    connectionId: "source-fixture-writer",
    expectedVersion: state.version,
    channels: ["LinkedIn"],
  },
  {
    model: "claude-sonnet-5-5",
    maxInputTokens: 1000000,
    maxOutputTokens: 128000,
  },
  "2026-11-07T12:00:00Z",
);
const result = {
  version: 2,
  summary: "Original household documentation evidence retained.",
  citations: [
    {
      url: "https://standards.example.org/household-handoff",
      title: "Household handoff documentation",
      citedText:
        "Household handoff documentation records local controls, support boundaries and instructions for household routines. This source explains the limits of that guidance.",
      sourceKind: "article_text",
    },
  ],
  status: "retrieved_references",
  scope: "public_reference_apis",
  retrievedAt: "2026-11-07T12:00:00Z",
  claims: [],
  notice: "Actual source passage fixture; no external provider calls.",
  retrieval: {
    adapter: "bounded-web-v2",
    requests: 1,
    responseBytes: 500,
    excerptBytes: 180,
    providers: ["public_page"],
    gaps: [],
    providerChargeCents: 0,
  },
};
state = applyCommand(
  state,
  DEMO_ACTOR,
  {
    type: "research.retrieve",
    channel: "LinkedIn",
    query: "Household handoff documentation",
    idempotencyKey: "existing-source",
  },
  { retrievalResult: result },
);
const sourceId = state.jobs[0].id;
const script = await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: "tsx",
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{IdeaComposer}from'./components/idea-composer';import{ideaJobInput}from'./lib/studio/idea-generation';import{generationInput}from'./lib/studio/generation';import{applyCommand}from'./lib/studio/engine';import{quote}from'./lib/studio/pricing';const actor=${JSON.stringify(DEMO_ACTOR)};function App(){const[state,setState]=useState(${JSON.stringify(state)});window.savedState=state;async function send(c){window.command=c;if(c.type!=='idea.generate')throw Error('Unexpected command');if(c.automaticResearch)throw Error('Selected evidence must not trigger another retrieval');const input=ideaJobInput(state,actor,c),priced=quote(state,input);let next=applyCommand(state,actor,c,{quotedCost:priced.cost,pricingSnapshot:priced.pricingSnapshot});const job=next.jobs[0];job.state='succeeded';job.result=JSON.stringify({ideas:Array.from({length:c.quantity},(_,i)=>({title:'Evidence-led handoff '+(i+1),brief:'Explain supported documentation practices and their limits.',audience:'Households',format:'Text post',sources:['https://standards.example.org/household-handoff']}))});next=applyCommand(next,actor,{type:'idea.importSavedResult',jobId:job.id});setState(next);}async function openContent(idea){let next=applyCommand(state,actor,{type:'idea.use',id:idea.id,targetChannel:'LinkedIn',account:'RyzaLab',format:'Text post'});const draft=next.contents.find(c=>c.ideaId===idea.id);window.writing=JSON.parse(generationInput(next,actor,{contentId:draft.id,kind:'text',expectedRevision:draft.revision,idempotencyKey:'write-from-source'}).prompt);setState(next);return true;}return <IdeaComposer mode='generate' initialChannel='LinkedIn' state={state} actor={actor} demo={false} send={send} refresh={async()=>{}} close={()=>{}} openContent={openContent}/>};createRoot(document.getElementById('app')).render(<App/>);`,
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("http://localhost:31348/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body:
        '<div id="app"></div><script>' +
        script.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    }),
  );
  await page.goto("http://localhost:31348/");
  await page
    .getByLabel("Topic / Brief", { exact: true })
    .fill("Household handoff documentation");
  await page.getByLabel("Audience", { exact: true }).fill("Households");
  await page
    .getByText("Use saved research or add source links", { exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Use this evidence in idea generation" })
    .check();
  await page
    .getByRole("button", { name: "Generate ideas", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Evidence-led handoff 1", exact: true })
    .waitFor();
  const command = await page.evaluate(() => (window as any).command);
  assert.equal(command.automaticResearch, false);
  assert.deepEqual(command.researchJobIds, [sourceId]);
  await page
    .getByRole("button", { name: "Use idea and open writing", exact: true })
    .first()
    .click();
  await page.waitForFunction(() => Boolean((window as any).writing));
  const writing = await page.evaluate(() => (window as any).writing);
  assert.equal(writing.webEvidence[0].jobId, sourceId);
  assert.equal(
    writing.webEvidence[0].citations[0].url,
    result.citations[0].url,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: explicit saved-source selection generates ideas without another retrieval and carries the same source passages into writing; no provider calls",
  );
} finally {
  await browser.close();
}
