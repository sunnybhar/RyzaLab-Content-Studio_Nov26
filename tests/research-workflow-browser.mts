import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import { applyCommand } from "../lib/studio/engine";
const key = "ryzalab-studio-v2",
  now = new Date().toISOString();
let fixture = initialState(DEMO_ACTOR, true);
fixture = applyCommand(
  fixture,
  DEMO_ACTOR,
  {
    type: "policy.adoptSolo",
    expectedRuleVersion: fixture.settings.protectedVersion,
    packageCap: 50,
    monthlyCap: 500,
    requireIndependentReview: false,
    autoDraft: false,
    autoReview: false,
  },
  { demo: true, now },
);
fixture.settings.requestCap = 50;
const c = fixture.contents[0];
c.title = "Research browser draft";
c.channel = "LinkedIn";
c.text = "";
c.metadata = "";
c.media = structuredClone(EMPTY_MEDIA);
c.state = "draft";
c.ideaId = fixture.ideas[0].id;
fixture.ideas[0].researchJobIds = ["cited"];
for (const kind of ["research", "text"] as const)
  fixture.connections.push({
    id: kind,
    title: `Configured ${kind}`,
    provider: "anthropic",
    model: "local-fixture-model",
    function: kind,
    hasKey: true,
    status: "validated",
    updatedAt: now,
    ...{ maxRequestCost: 10 },
  });
fixture.workflows.find(
  (w) => w.channel === "LinkedIn" && w.status === "active",
)!.functionConnections = { research: "research", text: "text" };
fixture.jobs.push({
  id: "cited",
  kind: "research",
  channel: "LinkedIn",
  connectionId: "research",
  prompt: "Public household handoff research fixture",
  estimate: 10,
  reserved: 10,
  state: "succeeded",
  attempt: 1,
  idempotencyKey: "fixture-research",
  createdBy: DEMO_ACTOR.email,
  createdAt: now,
  result: JSON.stringify({
    version: 1,
    summary: "Neutral fixture finding, not live research.",
    citations: [
      {
        url: "https://example.com/source",
        title: "Neutral source fixture",
        citedText: "A source excerpt.",
      },
    ],
    claims: [
      {
        text: "Neutral fixture finding.",
        sourceUrls: ["https://example.com/source"],
      },
    ],
    retrievedAt: now,
    searchesObserved: 1,
    stopReason: "end_turn",
    errors: [],
    status: "cited_research",
    notice: "Provider citations remain evidence requiring human review.",
  }),
});
fixture = applyCommand(
  fixture,
  DEMO_ACTOR,
  {
    type: "preparation.authorize",
    contentId: c.id,
    expectedRevision: c.revision,
    maxCents: 50,
  },
  { demo: true, now },
);
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const calls: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/studio/**", (r) => {
    calls.push(r.request().url());
    return r.abort();
  });
  await page.addInitScript(
    ({ key, fixture }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(fixture));
    },
    { key, fixture },
  );
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:3023") + "/preview",
  );
  const nav = async (name: string) =>
    page
      .locator(".s-sidebar nav")
      .getByRole("button", { name, exact: true })
      .click();
  await nav("Ideas");
  await page.getByRole("button",{name:"Generate with agent",exact:true}).click();
  let dialog=page.getByRole("dialog");
  assert.equal(await dialog.getByLabel("Web research evidence",{exact:true}).count(),0);
  await dialog.getByText(/automatically retrieve public references/).waitFor();
  await dialog.getByRole("button",{name:"Close idea window",exact:true}).click();
  let panel;
  await nav("Create");
  await page.locator(".s-content-title").filter({ hasText: c.title }).click();
  await page
    .locator("summary")
    .filter({ hasText: /^Web research/ })
    .first()
    .click();
  panel = page.getByRole("region", { name: "Web research" });
  assert.equal(
    await panel.getByLabel("Use this evidence in writing").isChecked(),
    true,
  );
  await panel.getByText("Find public references", { exact: true }).click();
  assert.equal(
    await panel
      .getByRole("button", { name: "Find references", exact: true })
      .isDisabled(),
    true,
  );
  await panel
    .getByText("Preview does not call search providers.", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Write with AI", exact: true })
    .click();
  await page.waitForFunction(
    (key) =>
      JSON.parse(localStorage.getItem(key)!).jobs.some(
        (j: any) => j.kind === "text",
      ),
    key,
  );
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  const job = state.jobs.find((j: any) => j.kind === "text");
  assert.deepEqual(job.researchJobIds, ["cited"]);
  assert.equal(
    JSON.parse(job.prompt).webEvidence[0].citations[0].url,
    "https://example.com/source",
  );
  assert.equal(job.researchSnapshots[0].raw, fixture.jobs[0].result);
  job.state="succeeded";
  settleWrittenOutput(state,job,{completion:"complete",text:JSON.stringify({body:"A household handoff can document the routine and contacts.",metadata:"",sources:["https://example.com/source"],questions:[]})},now);
  const submitted=applyCommand(state,DEMO_ACTOR,{type:"content.submit",id:c.id},{demo:true,now});
  await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:submitted});
  await page.reload();await nav("Reviews");await page.locator(".s-review-card").filter({hasText:c.title}).getByRole("button",{name:"Open review",exact:true}).click();
  await page.getByRole("dialog").getByText("Web sources used in this draft (1)",{exact:true}).click();
  assert.equal(await page.getByRole("dialog").getByRole("link",{name:"Neutral source fixture"}).getAttribute("href"),"https://example.com/source");
  assert.equal(calls.length, 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: integrated automatic-research idea window, retained citation links/date and inherited writing context and demo no-search protection; no live calls",
  );
} finally {
  await browser.close();
}
