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
    packageCap: 50,
    monthlyCap: 500,
    requireIndependentReview: false,
    autoDraft: false,
    autoReview: false,
  },
  { demo: true, now },
);
const c = fixture.contents[0];
c.title = "Input-required browser sample";
c.text = "Document the routine. [Ryan to confirm: actual example]";
c.metadata = "Internal note. [Ryan to confirm: actual example]";
c.state = "draft";
c.media.slides = [];
c.media.scenes = [];
c.media.narration = "";
c.media.captions = "";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ key, fixture }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(fixture));
    },
    { key, fixture },
  );
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:3019") + "/preview",
  );
  const navigate = async (name: string) =>
    page
      .locator(".s-sidebar nav")
      .getByRole("button", { name, exact: true })
      .click();
  await navigate("Create");
  await page.locator(".s-content-title").filter({ hasText: c.title }).click();
  const panel = page.getByRole("region", { name: "Needs your input" });
  await panel.getByRole("heading", { name: /2 items/ }).waitFor();
  assert.equal(
    await page.getByLabel("Publication metadata", { exact: true }).isVisible(),
    false,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Submit for review", exact: true })
      .isDisabled(),
    true,
  );
  await panel.getByRole("button", { name: /Post text:/ }).click();
  const text = page.getByLabel("Content text", { exact: true });
  await page.waitForFunction(() => {
    const el = document.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Content text"]',
    );
    return (
      el?.value.slice(el.selectionStart, el.selectionEnd) ===
      "[Ryan to confirm: actual example]"
    );
  });
  assert.equal(
    await text.evaluate((el: HTMLTextAreaElement) =>
      el.value.slice(el.selectionStart, el.selectionEnd),
    ),
    "[Ryan to confirm: actual example]",
  );
  await panel.getByRole("button", { name: /Publication notes:/ }).click();
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Publication metadata",
  );
  assert.equal(
    await page
      .getByLabel("Publication metadata", { exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.getByText("Publication notes (optional)", { exact: true }).click();
  await panel.getByRole("button", { name: /Post text:/ }).click();
  const mark = page.locator(".s-highlighted-mirror mark").first();
  assert.equal(
    await mark.evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(118, 88, 0)",
  );
  await page.screenshot({
    path: "/tmp/required-input-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok((await text.boundingBox())!.width < 390);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await text.fill(
    "A routine can list the people to call and the steps to follow.",
  );
  await panel.getByRole("heading", { name: /1 item/ }).waitFor();
  await panel.getByRole("button", { name: /Publication notes:/ }).click();
  await page
    .getByLabel("Publication metadata", { exact: true })
    .fill("Internal editorial note, not post copy.");
  await panel.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await navigate("Reviews");
  await page
    .locator(".s-review-card")
    .filter({ hasText: c.title })
    .getByRole("button", { name: "Open review", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Edit content", exact: true })
    .click();
  await dialog
    .getByLabel("Review post text", { exact: true })
    .fill("Edited text. [Confirm: true example]");
  assert.equal(
    await dialog
      .getByRole("button", { name: "Save and submit", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await dialog
      .getByRole("button", { name: "Approve copy", exact: true })
      .count(),
    0,
  );
  await dialog
    .getByLabel("Review post text", { exact: true })
    .fill("A written handoff can explain the routine and the fallback.");
  await dialog
    .getByRole("button", { name: "Save and submit", exact: true })
    .click();
  await dialog
    .getByText("A written handoff can explain the routine and the fallback.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await dialog
      .getByText("Internal editorial note, not post copy.", { exact: true })
      .isVisible(),
    false,
  );
  await dialog
    .getByLabel("I checked the copy, factual claims and required answers.")
    .check();
  assert.equal(
    await dialog
      .getByRole("button", { name: "Approve copy", exact: true })
      .isEnabled(),
    true,
  );
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  assert.equal(state.contents.find((d: any) => d.id === c.id).state, "review");
  assert.equal(state.packages.length, fixture.packages.length);
  assert.equal(state.jobs.length, fixture.jobs.length);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: highlighted input, exact-field jump, hidden notes, live blockers, mobile fit, same-popup editing and atomic resubmit; no approval or AI work inferred",
  );
} finally {
  await browser.close();
}
