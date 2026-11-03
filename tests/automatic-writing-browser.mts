import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { orchestrateInitialWriting } from "../lib/studio/writing-orchestration";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
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
    autoDraft: true,
    autoReview: false,
  },
  { demo: true, now },
);
fixture.settings.requestCap = 50;
fixture.ideas.unshift({
  ...fixture.ideas[0],
  id: "automatic-browser-idea",
  title: "A newly selected household handoff idea",
  state: "pending",
});
const workflow = fixture.workflows.find(
  (w) => w.channel === fixture.ideas[0].channel && w.status === "active",
)!;
fixture.connections.push({
  id: "auto-writer",
  title: "Configured writer",
  provider: "anthropic",
  model: "local-writing-model",
  function: "text",
  hasKey: true,
  status: "validated",
  updatedAt: now,
  ...{ maxRequestCost: 50 },
});
workflow.functionConnections = {
  ...workflow.functionConnections,
  text: "auto-writer",
};
fixture.settings.qualifiedRates = [
  {
    provider: "anthropic",
    model: "local-writing-model",
    function: "text",
    currency: "USD",
    inputCentsPerMillion: 100,
    outputCentsPerMillion: 500,
    maxInputBytes: 500000,
    maxOutputTokens: 1000,
    source: "https://example.com/prices",
    verifiedAt: "2026-10-29",
    qualified: true,
  },
];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.addInitScript(
    ({ key, fixture }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(fixture));
    },
    { key, fixture },
  );
  const url =
    (process.env.TEST_BASE_URL || "http://127.0.0.1:3011") + "/preview";
  async function select() {
    await page.goto(url);
    await page
      .locator(".s-sidebar nav")
      .getByRole("button", { name: "Ideas", exact: true })
      .click();
    await page
      .locator(".s-iw-card-title")
      .filter({ hasText: "A newly selected household handoff idea" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Use idea & open draft|Open linked draft/ })
      .click();
    await page.getByLabel("Content title").waitFor();
  }
  await select();
  let state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  assert.ok(state.contents[0].initialWriting);
  const count = state.contents.length;
  state = orchestrateInitialWriting(state, now);
  assert.equal(state.jobs.length, 1);
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key, state },
  );
  await select();
  assert.equal(await page.getByLabel("Content text").isDisabled(), true);
  const job = state.jobs[0];
  job.state = "succeeded";
  job.actual = job.reserved;
  job.reserved = 0;
  const unfinishedState = structuredClone(state);
  const body =
    "A household handoff can list the daily routine and useful contacts.";
  settleWrittenOutput(
    state,
    job,
    {
      completion: "complete",
      text: JSON.stringify({ body, metadata: "", sources: [], questions: [] }),
    },
    now,
  );
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key, state },
  );
  await select();
  assert.equal(await page.getByLabel("Content text").inputValue(), body);
  assert.equal(await page.getByLabel("Content text").isDisabled(), false);
  const final = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  assert.equal(final.contents.length, count);
  assert.equal(final.jobs.length, 1);
  assert.equal(orchestrateInitialWriting(final, now).jobs.length, 1);
  unfinishedState.jobs[0].outputStatus="incomplete";
  unfinishedState.jobs[0].result='[INCOMPLETE OUTPUT — token limit reached; not ready for approval]\n```json\n{"body":"Checking on Mom\\n\\nA recovered unfinished paragraph';
  await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:unfinishedState});
  await select();
  await page.getByRole("button",{name:"Recover available text into editor — no AI call",exact:true}).click();
  const recovered=await page.getByLabel("Content text").inputValue();
  assert.match(recovered,/Checking on Mom\n\nA recovered unfinished paragraph/);
  assert.match(recovered,/INCOMPLETE OUTPUT/);assert.doesNotMatch(recovered,/```|"body"/);
  const afterRecovery=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
  assert.equal(afterRecovery.jobs.length,1);
  console.log(
    "PASS: selected idea opens one draft, queued writing locks edits, completed copy and recovered incomplete paragraphs appear in the editor; no provider calls",
  );
} finally {
  await browser.close();
}
