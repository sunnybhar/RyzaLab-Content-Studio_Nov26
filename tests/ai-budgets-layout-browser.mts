import { chromium } from "playwright";
import assert from "node:assert/strict";
import { DEMO_ACTOR, initialState } from "../lib/studio/seed";
import { budgetMonth } from "../lib/studio/time";
import type { Job } from "../lib/studio/types";

const state = initialState(DEMO_ACTOR, true);
const period = budgetMonth(new Date().toISOString(), state.settings.timezone);
state.settings.monthlyCap = 2500;
state.jobs = Array.from({ length: 14 }, (_, index): Job => ({
  id: `budget-job-${index}`, kind: "text", channel: "LinkedIn",
  prompt: index === 4 ? "Distinct request prompt" : "Sample draft request",
  createdAt: new Date(Date.now() - index * 60000).toISOString(),
  createdBy: DEMO_ACTOR.email, connectionId: "fixture", estimate: 20, attempt: 1,
  idempotencyKey: `budget-request-${index}`, period,
  state: index === 0 ? "running" : index === 4 ? "failed" : "succeeded",
  reserved: index === 0 ? 20 : 0, actual: index === 0 ? undefined : 10,
}));

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium", args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(snapshot => {
    localStorage.setItem("ryzalab-studio-v2", JSON.stringify(snapshot));
  }, state);
  await page.goto((process.env.TEST_BASE_URL || "http://127.0.0.1:3056") + "/preview");
  await page.locator(".s-sidebar nav").getByRole("button", { name: "AI & budgets", exact: true }).click();
  const summary = page.getByRole("region", { name: "This month's AI spending" });
  await summary.getByText("$25.00", { exact: true }).waitFor();
  await summary.getByText("$1.30", { exact: true }).waitFor();
  await summary.getByText("$0.20", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Edit monthly limit" }).click();
  await page.getByLabel("Monthly AI budget ($)").fill("35.00");
  await page.getByRole("button", { name: "Save budget" }).click();
  await summary.getByText("$35.00", { exact: true }).waitFor();

  const spendingTab = page.getByRole("tab", { name: "Spending", exact: true });
  await spendingTab.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.getByRole("tab", { name: "AI connections" }).getAttribute("aria-selected"), "true");
  assert.equal(await page.getByRole("button", { name: "Edit monthly limit" }).count(), 0);
  await page.getByRole("tab", { name: "Generation activity" }).click();
  const requests = page.getByRole("button", { name: "Inspect text request for LinkedIn" });
  assert.equal(await requests.count(), 6);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Page 2 of 3").waitFor();
  await page.getByLabel("Request status").selectOption("Needs attention");
  assert.equal(await requests.count(), 1);
  await requests.click();
  const dialog = page.getByRole("dialog", { name: "Request details" });
  await dialog.getByText("View request", { exact: true }).click();
  await dialog.getByText("Distinct request prompt").waitFor();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.deepEqual(errors, []);
  console.log("PASS: spending totals, editing the budget, keyboard tabs, paginated activity, status filter, request details, and mobile width");
} finally {
  await browser.close();
}
