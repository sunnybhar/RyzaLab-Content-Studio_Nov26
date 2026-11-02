import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
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
    packageCap: 200,
    budgetCategory: "custom",
    monthlyCap: 777,
    requireIndependentReview: false,
    autoDraft: false,
    autoReview: false,
  },
  { demo: true, now },
);
const c = fixture.contents[0];
c.title = "Per-post budget fixture";
c.state = "draft";
fixture = applyCommand(
  fixture,
  DEMO_ACTOR,
  {
    type: "preparation.authorize",
    contentId: c.id,
    expectedRevision: c.revision,
    maxCents: 200,
    budgetCategory: "custom",
  },
  { demo: true, now },
);
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
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
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:3042") + "/preview",
  );
  await page
    .locator(".s-sidebar nav")
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await page.locator(".s-content-title").filter({ hasText: c.title }).click();
  await page.getByText("Post budget · $2.00", { exact: true }).click();
  await page
    .getByLabel("This post's budget category")
    .selectOption("short_text");
  await page
    .getByRole("button", { name: "Update this post's allowance", exact: true })
    .click();
  await page.waitForFunction(
    (key) =>
      JSON.parse(localStorage.getItem(key)!).preparations[0].maxCents === 50,
    key,
  );
  await page.getByLabel("This post's budget category").selectOption("custom");
  await page.getByLabel("This post's custom cap ($)").fill("1.60");
  await page
    .getByRole("button", { name: "Update this post's allowance", exact: true })
    .click();
  await page.waitForFunction(
    (key) =>
      JSON.parse(localStorage.getItem(key)!).preparations[0].maxCents === 160,
    key,
  );
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  assert.equal(state.settings.monthlyCap, 777);
  assert.equal(state.settings.reviewPolicy.packageCap, 200);
  assert.equal(state.preparations[0].budgetCategory, "custom");
  assert.equal(state.jobs.length, fixture.jobs.length);
  console.log(
    "PASS: per-post short50c/custom160c changes preserve founder ceiling and monthly budget; no AI request",
  );
} finally {
  await browser.close();
}
