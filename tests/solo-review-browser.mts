import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";

const key = "ryzalab-studio-v2";
let fixture = initialState(DEMO_ACTOR, true);
fixture = applyCommand(fixture, DEMO_ACTOR, {
  type: "policy.adoptSolo", expectedRuleVersion: fixture.settings.protectedVersion,
  packageCap: 50, monthlyCap: 500, requireIndependentReview: false,
  autoDraft: true, autoReview: true,
}, {demo: true});
const draft = fixture.contents[0];
draft.state = "review";
draft.text = "A household handoff can list daily routines and who to contact.";
draft.metadata = "A simple checklist.";
draft.media = structuredClone(EMPTY_MEDIA);
draft.format = "Text post";
const browser = await chromium.launch({headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
try {
  const page = await context.newPage();
  await page.addInitScript(({key, fixture}) => localStorage.setItem(key, JSON.stringify(fixture)), {key, fixture});
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:3010/preview");
  await page.locator(".s-sidebar nav").getByRole("button", {name: "Reviews", exact: true}).click();
  await page.getByRole("button", {name: "Open review", exact: true}).click();
  const modal = page.getByRole("dialog");
  await modal.getByText("1. Review the copy", {exact: true}).waitFor();
  assert.equal(await modal.locator(".s-stage-tracker").count(), 0);
  assert.equal(await modal.getByRole("button", {name: "Approve copy"}).isDisabled(), true);
  await modal.getByLabel("What did you check?").fill("Reviewed the wording and the supplied brand reference.");
  await modal.getByRole("button", {name: "Approve copy"}).click();
  await modal.getByText("2. Review the complete package", {exact: true}).waitFor();
  assert.equal(await modal.getByRole("button", {name: "Approve final package"}).isDisabled(), true);
  await modal.getByLabel(/I reviewed the exact copy/).check();
  await modal.getByRole("button", {name: "Approve final package"}).click();
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || "{}").packages?.length === 1, key);
  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), key);
  assert.equal(state.contents[0].copyAcceptances.length, 1);
  assert.equal(state.packages[0].text, draft.text);
  assert.equal(state.packages[0].account, draft.account);
  console.log("PASS: copy and final package require two explicit human decisions in solo mode");
} finally { await context.close(); await browser.close(); }
