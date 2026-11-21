import assert from "node:assert/strict";
import { chromium } from "playwright";
import { DEMO_ACTOR, initialState } from "../lib/studio/seed";

const state = initialState(DEMO_ACTOR, true);
const sample = state.contents[0];
state.contents = Array.from({ length: 8 }, (_, index) => ({
  ...sample,
  id: `create-draft-${index}`,
  title: `Draft ${index + 1}`,
  channel: index === 1 ? "Instagram" : "LinkedIn",
  format: "Text post",
  state: index === 1 ? "changes" : "draft",
  updatedAt: new Date(Date.UTC(2026, 10, 20 - index, 19, 12)).toISOString(),
  deletedAt: undefined,
}));
state.packages = [];
state.schedules = [];

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(12000);
  await page.addInitScript(snapshot => {
    localStorage.setItem("ryzalab-studio-v2", JSON.stringify(snapshot));
  }, state);
  await page.goto(`${process.env.TEST_BASE_URL || "http://127.0.0.1:3085"}/preview`);
  await page.locator(".s-sidebar nav").getByRole("button", { name: "Create", exact: true }).click();
  const sections = page.getByRole("navigation", { name: "Create sections" });
  assert.deepEqual((await sections.getByRole("button").allTextContents()).slice(0, 3), ["Drafts", "Pipeline briefs", "Newsletter"]);
  const table = page.getByRole("table");
  await table.waitFor();
  assert.equal(await table.locator("tbody tr").count(), 6);
  assert.match(await table.locator("tbody tr").first().innerText(), /#1[\s\S]*Draft 1[\s\S]*2:12 PM/);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Page 2 of 2", { exact: true }).waitFor();
  await page.getByLabel("Sort", { exact: false }).selectOption("Oldest first");
  assert.match(await table.locator("tbody tr").first().innerText(), /#8/);
  await page.getByLabel("Channel", { exact: false }).selectOption("Instagram");
  await page.getByRole("button", { name: "Draft 2", exact: true }).click();
  await page.getByRole("complementary", { name: "Draft preview" }).getByText("Instagram · Needs changes").waitFor();
  await page.getByRole("button", { name: "Production board", exact: true }).click();
  await page.getByRole("region", { name: "Needs changes", exact: true }).getByRole("button", { name: /#2.*Draft 2/ }).waitFor();

  await sections.getByRole("button", { name: "Pipeline briefs", exact: true }).click();
  await page.getByRole("heading", { name: "Existing Pipeline" }).waitFor();
  await sections.getByRole("button", { name: "Newsletter", exact: true }).click();
  await page.getByLabel("Combined newsletter title").waitFor();
  await sections.getByRole("button", { name: "Drafts", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Production board", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByLabel("Channel", { exact: false }).inputValue(), "Instagram");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  console.log("PASS: Create sections, numbering, dates, pagination, sorting, filtering, preview, board and mobile width");
} finally {
  await browser.close();
}
