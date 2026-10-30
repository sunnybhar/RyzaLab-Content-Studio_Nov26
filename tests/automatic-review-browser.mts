import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { orchestrateReviews } from "../lib/studio/review-orchestration";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
const key = "ryzalab-studio-v2";
const now = new Date().toISOString();
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
    autoReview: true,
  },
  { now, demo: true },
);
fixture.settings.requestCap = 50;
const content = fixture.contents[0];
content.text =
  "A household handoff can list daily routines and who to contact.";
content.state = "review";
content.metadata = "";
content.media = structuredClone(EMPTY_MEDIA);
content.format = "Text post";
const workflow = fixture.workflows.find(
  (w) => w.channel === content.channel && w.status === "active",
)!;
fixture.connections.push({
  id: "reviewer",
  title: "Configured reviewer",
  provider: "anthropic",
  model: "reviewer-model",
  function: "review",
  hasKey: true,
  status: "validated",
  updatedAt: now,
  ...{ maxRequestCost: 50 },
});
workflow.functionConnections = {
  ...workflow.functionConnections,
  review: "reviewer",
};
fixture.settings.qualifiedRates = [
  {
    provider: "anthropic",
    model: "reviewer-model",
    function: "review",
    currency: "USD",
    inputCentsPerMillion: 100,
    outputCentsPerMillion: 500,
    maxInputBytes: 500000,
    maxOutputTokens: 1000,
    source: "https://example.com/prices",
    verifiedAt: "2026-10-28",
    qualified: true,
  },
];
fixture = applyCommand(
  fixture,
  DEMO_ACTOR,
  {
    type: "preparation.authorize",
    contentId: content.id,
    expectedRevision: content.revision,
    maxCents: 50,
  },
  { now },
);
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
    (process.env.TEST_BASE_URL || "http://127.0.0.1:3008") + "/preview";
  const open = async () => {
    await page.goto(url);
    await page
      .locator(".s-sidebar nav")
      .getByRole("button", { name: "Reviews", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open review", exact: true })
      .click();
  };
  await open();
  let dialog = page.getByRole("dialog");
  await dialog.getByText("Add review notes or sources checked (optional)",{exact:true}).click();
  await dialog
    .getByLabel("What did you check?")
    .fill("Read the exact wording and supplied brand references.");
  await dialog
    .getByRole("button", { name: "Approve copy", exact: true })
    .click();
  await dialog
    .getByText("2. Review the complete package", { exact: true })
    .waitFor();
  let state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  state = orchestrateReviews(state, now);
  assert.equal(state.jobs.length, 1);
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key, state },
  );
  await open();
  dialog = page.getByRole("dialog");
  assert.equal(
    await dialog
      .getByRole("button", { name: "Approve final package", exact: true })
      .isDisabled(),
    true,
  );
  const job = state.jobs[0];
  job.state = "succeeded";
  job.actual = job.reserved;
  job.reserved = 0;
  settleWrittenOutput(
    state,
    job,
    {
      completion: "complete",
      text: JSON.stringify({
        summary:
          "Reviewed this exact copy using the supplied reference context.",
        issues: [],
      }),
    },
    now,
  );
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key, state },
  );
  await open();
  dialog = page.getByRole("dialog");
  await dialog.getByText(/Reviewed this exact copy using/).waitFor();
  await dialog.getByLabel(/I reviewed the exact copy/).check();
  await dialog
    .getByRole("button", { name: "Approve final package", exact: true })
    .click();
  await page.waitForFunction(
    (key) => JSON.parse(localStorage.getItem(key)!).packages.length === 1,
    key,
  );
  const planner = page.getByRole("dialog");
  await planner
    .getByRole("heading", { name: "Plan a manual publication", exact: true })
    .waitFor();
  const packageSelect = planner.getByLabel("Approved package");
  assert.equal(await packageSelect.locator("option").count(), 1);
  const time = planner.getByLabel(/Publication time/);
  assert.equal(await time.inputValue(), "");
  await time.fill("2026-11-05T09:30");
  await planner
    .getByRole("button", { name: "Add to calendar", exact: true })
    .click();
  await page.waitForFunction(
    (key) => JSON.parse(localStorage.getItem(key)!).schedules.length === 1,
    key,
  );
  const planned = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  assert.equal(planned.schedules[0].packageId, planned.packages[0].id);
  assert.equal(planned.schedules[0].at, "2026-11-05T14:30:00.000Z");
  assert.equal(planned.schedules[0].publicationUrl, undefined);
  console.log(
    "PASS: simulated auto review gates final approval; exact report and two human decisions retained; no provider calls",
  );
} finally {
  await browser.close();
}
