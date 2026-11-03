import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";

const key = "ryzalab-studio-v2";
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
  { demo: true },
);
const draft = fixture.contents[0];
draft.state = "review";
draft.text = "A household handoff can list daily routines and who to contact.";
draft.metadata = "A simple checklist.";
draft.media = structuredClone(EMPTY_MEDIA);
draft.format = "Text post";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
try {
  const page = await context.newPage();
  await page.addInitScript(
    ({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)),
    { key, fixture },
  );
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:3010/preview");
  await page
    .locator(".s-sidebar nav")
    .getByRole("button", { name: "Reviews", exact: true })
    .click();
  await page.getByRole("button", { name: "Open review", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal
    .getByRole("button", { name: "Approve & publish", exact: true })
    .waitFor();
  assert.equal(
    await modal
      .getByRole("button", { name: "Approve copy", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await modal.getByText("Final package", { exact: true }).count(),
    0,
  );
  assert.equal(
    await modal.getByRole("button", { name: /Record .* check/ }).count(),
    0,
  );
  await modal
    .getByRole("button", { name: "Approve & publish", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Ready to publish", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Copy approved content", exact: true })
    .waitFor();
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "{}"),
    key,
  );
  assert.equal(state.contents[0].copyAcceptances?.length || 0, 0);
  assert.equal(state.packages[0].text, draft.text);
  assert.equal(state.packages[0].singleReview, true);
  assert.equal(state.schedules.length, 0);
  console.log(
    "PASS: one review approval, no manual checklist or copy tab, direct honest publication handoff",
  );
} finally {
  await context.close();
  await browser.close();
}
