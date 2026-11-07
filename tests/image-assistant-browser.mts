import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
const fixture = initialState(DEMO_ACTOR, true);
fixture.contents = fixture.contents.slice(0, 1);
const content = fixture.contents[0];
content.state = "draft";
fixture.jobs = [];
fixture.connections.push({
  id: "image-connection",
  title: "Image OpenAI",
  provider: "openai",
  function: "image",
  model: "qualified-image-model",
  hasKey: true,
  status: "validated",
  updatedAt: new Date().toISOString(),
  maxRequestCost: 4,
} as any);
const workflow = fixture.workflows.find(
  (w) => w.channel === content.channel && w.status === "active",
)!;
workflow.functionConnections = {
  ...workflow.functionConnections,
  image: "image-connection",
};
fixture.settings.reviewPolicy = undefined;
const script = await build({
  stdin: {
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{ImageAssistant}from'./components/image-assistant';import{applyCommand}from'./lib/studio/engine';window.calls=[];function App(){const[state,setState]=useState(${JSON.stringify(fixture)});const content=state.contents[0];async function run(c){window.calls.push(c);if(c.type==='job.enqueue')setState({...state,jobs:[{...c,id:'generated-image',state:'succeeded',result:'/api/studio/assets?id=11111111-1111-4111-8111-111111111111',createdAt:new Date().toISOString(),createdBy:${JSON.stringify(DEMO_ACTOR.email)},reserved:4}]});else setState(applyCommand(state,${JSON.stringify(DEMO_ACTOR)},c,{demo:true}));return true;}return <><ImageAssistant content={content} state={state} actor={${JSON.stringify(DEMO_ACTOR)}} dirty={false} readOnly={false} busy={false} run={run} refresh={async()=>{}} AssetMedia={({source})=><p>Private image preview: {source}</p>}/><output>{content.media.imageUrl?'Image attached':'No attached image'}</output></>};createRoot(document.getElementById('app')).render(<App/>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
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
  await page.route("http://localhost:31340/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body:
        '<div id="app"></div><script>' +
        script.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    }),
  );
  await page.goto("http://localhost:31340/");
  assert.equal((await page.evaluate(() => (window as any).calls)).length, 0);
  await page
    .getByLabel("Image brief", { exact: true })
    .fill("A calm conceptual living room in warm light");
  assert.ok(
    await page
      .getByRole("button", { name: "Generate image", exact: true })
      .isDisabled(),
  );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Generate image", exact: true })
    .click();
  await page.getByRole("button", { name: "Use image", exact: true }).waitFor();
  await page
    .getByLabel("Image description", { exact: true })
    .fill("Conceptual room, AI generated");
  await page.getByRole("button", { name: "Use image", exact: true }).click();
  await page.getByText("Image attached", { exact: true }).waitFor();
  const calls = await page.evaluate(() => (window as any).calls);
  assert.equal(calls.filter((c: any) => c.type === "job.enqueue").length, 1);
  assert.equal(calls[0].confirmed, true);
  assert.equal(calls[1].alt, "Conceptual room, AI generated");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: no image request on mount, explicit maximum consent, saved result preview and separate attachment; no provider calls",
  );
} finally {
  await browser.close();
}
