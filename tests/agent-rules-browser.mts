import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import JSZip from "jszip";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3057";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);
  const errors: string[] = [], calls: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/studio/**", route => {
    calls.push(route.request().url());
    return route.abort();
  });
  await page.goto(base + "/preview");
  const nav = page.locator(".s-sidebar nav");
  await nav.getByRole("button", { name: "Agent Rules", exact: true }).click();
  await page.getByRole("heading", { name: "Rule workspace", exact: true }).waitFor();
  const categories = page.getByRole("navigation", { name: "Rule categories" });
  const preview = page.getByRole("complementary", { name: "Resource preview" });
  const dialog = page.getByRole("dialog");
  const close = () => dialog.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: /^Instructions ·|^Instructions LinkedIn/ }).click();
  await preview.getByRole("button", { name: "Manage resource" }).click();
  await dialog.getByLabel("Upload Instructions file", { exact: true }).setInputFiles({
    name: "instructions.txt", mimeType: "text/plain", buffer: Buffer.from("Stored instructions."),
  });
  await dialog.getByRole("status").filter({ hasText: "Instructions saved for LinkedIn." }).waitFor();
  await close();
  await categories.getByRole("button", { name: "Knowledge" }).click();
  await page.getByRole("button", { name: /^Context LinkedIn/ }).click();
  await preview.getByRole("button", { name: "Manage resource" }).click();
  await dialog.getByLabel("Upload Markdown context (.md) file").setInputFiles({
    name: "context.md", mimeType: "text/markdown", buffer: Buffer.from("# Brand context"),
  });
  await dialog.getByRole("status").filter({ hasText: "saved for LinkedIn." }).waitFor();
  await close();
  const download = page.waitForEvent("download");
  await preview.getByRole("button", { name: "Download original" }).click();
  assert.equal(await fs.readFile((await (await download).path())!, "utf8"), "# Brand context");

  await page.getByRole("button", { name: "Channel package" }).click();
  const zip = new JSZip();
  zip.file("INSTRUCTIONS.md", "Package instructions");
  zip.file("knowledge/background.md", "# Package background");
  const bytes = await zip.generateAsync({ type: "nodebuffer" });
  await dialog.getByLabel("Agent Rules ZIP package").setInputFiles({
    name: "channel.zip", mimeType: "application/zip", buffer: bytes,
  });
  await dialog.getByLabel("Package Instructions").fill("Edited package instructions");
  await dialog.getByRole("button", { name: "Save package for LinkedIn" }).click();
  await dialog.getByRole("status").filter({ hasText: "saved together" }).waitFor();
  await close();
  await categories.getByRole("button", { name: "ZIP history" }).click();
  await page.getByRole("button", { name: /^channel.zip/ }).click();
  const original = page.waitForEvent("download");
  await preview.getByRole("button", { name: "Download original" }).click();
  assert.deepEqual(await fs.readFile((await (await original).path())!), bytes);

  await categories.getByRole("button", { name: "Voice examples" }).click();
  await page.getByRole("button", { name: "Add voice example", exact: true }).click();
  await dialog.getByLabel("Voice example title").fill("Original post");
  await dialog.getByLabel("Original voice example content").fill("A sample <script> kept as plain text.");
  await dialog.getByRole("button", { name: "Save original content example" }).click();
  await dialog.getByRole("status").filter({ hasText: "example saved" }).waitFor();
  await close();
  await page.getByLabel("Search resources").fill("original");
  await page.getByRole("button", { name: /^Original post/ }).click();
  await preview.getByText("A sample <script> kept as plain text.").waitFor();
  await page.getByLabel("Agent Rules channel").selectOption("Newsletter");
  await page.getByRole("button", { name: /^Original post/ }).waitFor();
  await categories.getByRole("button", { name: "Knowledge" }).click();
  assert.equal(await page.getByRole("button", { name: /^newsletter-context.md/ }).count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ryzalab-studio-v2")!));
  assert.equal(state.agentRuleFiles.length, 2);
  assert.equal(state.agentVoiceExamples.length, 1);
  assert.equal(state.jobs.length, 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(calls, []);
  console.log("PASS: Rule Workspace categories, search, preview, upload, ZIP history, shared voice examples, and mobile width");
} finally {
  await browser.close();
}
