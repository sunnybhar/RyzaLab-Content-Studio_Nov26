import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import JSZip from "jszip";
import { calendarTemplate } from "../lib/studio/calendar-workbook";
const base = process.env.TEST_BASE_URL || "http://localhost:3005";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  acceptDownloads: true,
});
const errors: string[] = [],
  calls: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/studio**", (route) => {
  calls.push(route.request().url());
  return route.abort();
});
const navigate = async (name: string) => {
  await page.locator(".s-sidebar nav").getByText(name, { exact: true }).click();
};
const saved = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("ryzalab-studio-v2") || "null"),
  );
try {
  await page.goto(base + "/preview");
  await page
    .getByRole("heading", { name: "Your campaign command center" })
    .waitFor();
  await navigate("Calendar");
  await page.locator(".s-channel-tabs").getByRole("button", { name: /Newsletter$/ }).click();
  await page
    .getByRole("button", { name: "Import calendar", exact: true })
    .click();
  const importer = page.getByRole("region", {
    name: "Import content calendar",
  });
  const wait = page.waitForEvent("download");
  await importer
    .getByRole("button", { name: "Download XLSX template" })
    .click();
  const download = await wait;
  assert.match(download.suggestedFilename(), /\.xlsx$/);
  await download.saveAs("/tmp/RyzaLab-Calendar-Template-Test.xlsx");
  const zip = await JSZip.loadAsync(await calendarTemplate());
  const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
  const escape = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const rows = [
    [
      "TEST-01",
      "Browser imported construction brief",
      "Plan local controls before installation",
      "LinkedIn",
      "RyzaLab",
      "Text post",
      "2026-11-10",
      "12:15",
      "America/New_York",
      "Homeowners",
      "https://example.org/controls",
      "Imported source copy, not approved.",
      "source check unverified",
      "Planned",
    ],
    [
      "TEST-02",
      "Browser combined brief",
      "Shared website and social idea",
      "Website + LinkedIn",
      "RyzaLab",
      "Text post",
      "2026-11-11",
      "",
      "America/New_York",
      "",
      "",
      "",
      "",
      "Published",
    ],
    ["TEST-03", "Unsupported website only", "", "Website"],
    [
      "TEST-04",
      "Unscheduled newsletter brief",
      "Construction and practical care",
      "Newsletter",
      "RyzaLab",
      "Newsletter",
    ],
    ["", "", "Formatted blank title", "LinkedIn"],
  ];
  const xml = rows
    .map(
      (row, i) =>
        `<row r="${i + 2}">` +
        row
          .map(
            (v, j) =>
              `<c r="${String.fromCharCode(65 + j)}${i + 2}" t="inlineStr"><is><t>${escape(v)}</t></is></c>`,
          )
          .join("") +
        "</row>",
    )
    .join("");
  zip.file(
    "xl/worksheets/sheet1.xml",
    sheet.replace("</sheetData>", xml + "</sheetData>"),
  );
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await importer.locator('input[type="file"]').setInputFiles({
    name: "test-calendar.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await importer.getByRole("button", { name: "Preview import" }).waitFor();
  await importer.getByRole("button", { name: "Preview import" }).click();
  assert.equal(
    await importer
      .getByRole("checkbox", { name: "Include row 3", exact: true })
      .isChecked(),
    false,
  );
  assert.equal(
    await importer
      .getByRole("checkbox", { name: "Include row 4", exact: true })
      .isDisabled(),
    true,
  );
  await importer
    .getByRole("button", { name: "Confirm import · 2 selected" })
    .click();
  await importer.getByText(/Imported 2 new briefs/).waitFor();
  await page.getByRole("dialog", { name: "Import calendar" }).getByRole("button", { name: "Close", exact: true }).click();
  const datedBrief = page.getByRole("complementary", { name: "Selected day agenda" })
    .getByRole("button", { name: rows[0][1], exact: true });
  await datedBrief.waitFor();
  assert.equal(await page.locator(".s-channel-tabs").getByRole("button", { name: "All channels", exact: true }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Previous month" }).click();
  await datedBrief.waitFor({ state: "hidden" });
  await page.getByLabel("Jump to imported month").selectOption("2026-11");
  await datedBrief.waitFor();
  await page.getByRole("button", { name: "Weekly Agenda", exact: true }).click();
  await page.getByRole("region", { name: "Weekly agenda" }).getByRole("button", { name: rows[0][1], exact: true }).waitFor();
  await page.getByRole("button", { name: "Workflow Planner", exact: true }).click();
  await page.getByRole("region", { name: "Drafting", exact: true }).waitFor();
  await page.getByRole("button", { name: "Pipeline Intake", exact: true }).click();
  const briefName = "Unscheduled newsletter brief";
  await page.getByRole("region", { name: "Needs a date" }).getByRole("button", { name: briefName }).click();
  await page.getByRole("button", { name: "Set date", exact: true }).click();
  await page.getByLabel("Date", { exact: true }).fill("2026-11-11");
  await page.getByRole("button", { name: "Save brief date", exact: true }).click();
  await page.getByRole("region", { name: "Dated briefs" }).getByRole("button", { name: briefName }).waitFor();
  assert.equal((await saved()).pipelineBriefs.find((brief: { title: string }) => brief.title === briefName).plannedDate, "2026-11-11");
  let state = await saved();
  assert.equal(state.pipelineBriefs.length, 2);
  assert.equal(state.pipelineBriefs[0].plannedAt, "2026-11-10T17:15:00.000Z");
  const originalJobs = state.jobs.length;
  await navigate("Ideas");
  await page.getByRole("button", { name: "Pipeline briefs", exact: true }).click();
  const pipeline = page.getByRole("region", { name: "Existing Pipeline" });
  await pipeline.getByLabel("Search titles and angles").fill("construction");
  await pipeline
    .getByRole("button", { name: "Generate ideas from brief" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Topic / Brief", { exact: true }).waitFor();
  assert.equal(
    await dialog.getByLabel("Topic / Brief", { exact: true }).inputValue(),
    rows[0][1],
  );
  await dialog
    .getByRole("button", { name: "Close idea window", exact: true })
    .click();
  assert.equal((await saved()).jobs.length, originalJobs);
  await pipeline.getByRole("button", { name: "Write directly" }).click();
  await page
    .getByText("Existing Pipeline · TEST-01", { exact: true })
    .waitFor();
  state = await saved();
  assert.equal(state.contents[0].pipelineBriefId, state.pipelineBriefs[0].id);
  assert.equal(state.contents[0].text, rows[0][11]);
  assert.equal(state.jobs.length, originalJobs);
  await page.reload();
  await navigate("Create");
  await page.getByRole("button", { name: "Pipeline briefs", exact: true }).click();
  const newsletterBrief = page.getByRole("region", { name: "Existing Pipeline" });
  await newsletterBrief.getByLabel("Search titles and angles").fill("newsletter");
  await newsletterBrief.getByLabel("Create for").selectOption("Newsletter");
  await newsletterBrief.getByRole("button", { name: "Use brief in Brand Newsletter" }).click();
  await page.getByLabel("Combined newsletter title").waitFor();
  const chosenBrief = page.getByRole("checkbox", { name: /Unscheduled newsletter brief/ });
  assert.equal(await chosenBrief.isChecked(), true);
  assert.equal((await saved()).contents.length, state.contents.length);
  await navigate("Calendar");
  await page
    .getByRole("button", { name: "Import calendar", exact: true })
    .click();
  await importer.locator('input[type="file"]').setInputFiles({
    name: "test-calendar.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await importer.getByRole("button", { name: "Preview import" }).click();
  assert.equal(
    await importer
      .getByRole("checkbox", { name: "Update brief only" })
      .first()
      .isDisabled(),
    true,
  );
  await importer
    .getByRole("button", { name: "Confirm import · 2 selected" })
    .click();
  assert.equal((await saved()).pipelineBriefs.length, 2);
  // Optional user workbook compatibility check: parsing/preview only, never saved or committed.
  if (process.env.CALENDAR_TEST_WORKBOOK) {
    await importer
      .locator('input[type="file"]')
      .setInputFiles(process.env.CALENDAR_TEST_WORKBOOK);
    await importer.getByRole("button", { name: "Preview import" }).click();
    console.log(
      "Reference workbook titled rows:",
      await importer.locator("tbody tr").count(),
    );
    assert.equal(await importer.locator("tbody tr").count(), 19);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
    "Mobile overflow",
  );
  await page.screenshot({
    path: "/tmp/ryza-calendar-pipeline-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(calls, []);
  console.log(
    "Calendar/Pipeline browser passed: XLSX template, parsing, validation, combined/unsupported destinations, dated/unscheduled briefs, Ideas/Create, source copy, reload persistence, protected duplicate updates, mobile; zero API calls.",
  );
} finally {
  await browser.close();
}
