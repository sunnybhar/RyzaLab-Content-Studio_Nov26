import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import type { Job } from "../lib/studio/types";
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
c.channel = "LinkedIn";
c.title = "Composer browser sample";
c.text = "";
c.metadata = "";
c.state = "draft";
const body =
  "A household handoff starts with a written routine.\n\n" +
  "Keep the contact list available. ".repeat(12).trim();
const job: Job = {
  id: "composer-saved",
  kind: "text",
  channel: c.channel,
  account: c.account,
  contentId: c.id,
  prompt: "Canonical fixture",
  connectionId: "fixture",
  estimate: 14,
  reserved: 14,
  state: "succeeded",
  attempt: 1,
  idempotencyKey: "composer-fixture",
  createdBy: DEMO_ACTOR.email,
  createdAt: now,
  outputContract: "draft_v1",
  outputStatus: "invalid",
  result: JSON.stringify({
    body,
    metadata: { visual: "No image needed" },
    sources: [],
    questions: ["Which routine was actually documented?"],
  }),
};
fixture.jobs.unshift(job);
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const external: string[] = [];
  await page.route("**/api/studio/**", (r) => {
    external.push(r.request().url());
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
    (process.env.TEST_BASE_URL || "http://127.0.0.1:3017") + "/preview",
  );
  await page
    .locator(".s-sidebar nav")
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await page.locator(".s-content-title").filter({ hasText: c.title }).click();
  const assistance = page.getByRole("region", {
    name: "Draft writing assistance",
  });
  assert.equal(
    await assistance
      .locator("xpath=ancestor::*[contains(@class,'s-writing')]")
      .count(),
    1,
  );
  await page
    .getByRole("button", {
      name: "Prepare saved draft — no AI call",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Open suggested text in editor", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Content text", { exact: true }).inputValue(),
    body,
  );
  assert.match(
    await page.getByLabel("Publication metadata", { exact: true }).inputValue(),
    /\[Confirm: Which routine/,
  );
  await page
    .getByLabel("Content text", { exact: true })
    .fill(body + "\nHuman edit.");
  await page.getByRole("button", { name: "Preview post", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("heading", { name: "LinkedIn post preview" })
    .waitFor();
  await dialog.getByText(/Includes unsaved edits/).waitFor();
  await dialog.getByRole("button", { name: "…see more", exact: true }).click();
  assert.match(await dialog.locator(".s-feed-copy").innerText(), /Human edit/);
  assert.equal(
    await dialog.getByText("No image needed", { exact: true }).count(),
    0,
  );
  assert.ok((await dialog.boundingBox())!.width <= 760);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok((await dialog.boundingBox())!.width <= 390);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "/tmp/create-feed-preview.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Create newsletter from this", exact: true })
    .click();
  await page.getByText(/Newsletter draft ready/).waitFor();
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  assert.equal(state.jobs.length, fixture.jobs.length);
  assert.equal(state.contents[0].channel, "Newsletter");
  assert.match(state.contents[0].newsletterSource.text, /Human edit/);
  assert.equal(
    await page.getByLabel("Content text", { exact: true }).inputValue(),
    "",
  );
  await page
    .locator(".s-sidebar nav")
    .getByRole("button", { name: "Ideas", exact: true })
    .click();
  await page.locator(".s-iw-card-title").first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Create newsletter from this idea",
      exact: true,
    })
    .click();
  await page.getByLabel("Content text", { exact: true }).waitFor();
  const afterIdea = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  assert.equal(afterIdea.contents[0].newsletterSource.kind, "idea");
  assert.equal(afterIdea.jobs.length, fixture.jobs.length);
  assert.equal(external.length, 0);
  console.log(
    "PASS: inline writing recovery, editable body, retained question blockers, unsaved feed preview, Escape close, linked newsletter source; no provider calls",
  );
} finally {
  await browser.close();
}
