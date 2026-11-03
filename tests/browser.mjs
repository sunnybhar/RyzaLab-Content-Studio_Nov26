import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const baseURL = process.env.TEST_BASE_URL || "http://localhost:3005";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const stateKey = "ryzalab-studio-v2";
const outputDirectory = "/tmp/ryzalab-v2-browser";
fs.mkdirSync(outputDirectory, { recursive: true });

async function main() {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  const connectorCalls = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // These tests exercise demo metadata and honest unavailable states. A demo action must
  // never reach OAuth, credential validation, private storage, or a paid provider.
  await page.route(
    /\/api\/studio\/(?:google\/connect|docs|connections(?:\/validate)?|assets)(?:\?|$)/,
    (route) => {
      connectorCalls.push(route.request().url());
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Unexpected external connector request in demo browser test.",
        }),
      });
    },
  );
  const state = () =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "null"),
      stateKey,
    );
  const navigate = async (name) => {
    const menu = page.getByRole("button", { name: "Open menu", exact: true });
    if (
      (await menu.isVisible()) &&
      !(await page
        .locator(".s-sidebar")
        .evaluate((node) => node.classList.contains("s-open")))
    )
      await menu.click();
    await page
      .locator(".s-sidebar nav")
      .getByText(name, { exact: true })
      .click();
    if (await menu.isVisible())
      await page.waitForFunction(
        () =>
          document.querySelector(".s-sidebar").getBoundingClientRect().right <=
          1,
      );
  };
  const dismissNotice = async () => {
    const dismiss = page.getByRole("button", {
      name: "Dismiss notification",
      exact: true,
    });
    if (await dismiss.count()) await dismiss.click();
  };
  const closeError = async () => {
    const dismiss = page.getByRole("button", {
      name: "Dismiss error",
      exact: true,
    });
    if (await dismiss.count()) await dismiss.click();
  };
  const dialog = () => page.getByRole("dialog");
  const saveDraft = async () => {
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
  };
  const saveDownload = async (action, name) => {
    const waiting = page.waitForEvent("download");
    await action();
    const download = await waiting;
    const target = path.join(
      outputDirectory,
      name || download.suggestedFilename(),
    );
    await download.saveAs(target);
    assert.equal(await download.failure(), null);
    assert.ok(
      fs.statSync(target).size > 100,
      `${name || target} should contain exported data`,
    );
    return target;
  };
  const openContent = async (title) => {
    await navigate("Create");
    await page.locator(".s-content-title").filter({ hasText: title }).click();
    await page.getByLabel("Content text", { exact: true }).waitFor();
  };

  try {
    await page.goto(baseURL);
    await page
      .getByRole("heading", {
        name: "Your campaign command center",
        exact: true,
      })
      .waitFor();
    await page
      .getByText("Demo mode · saved on this device", { exact: false })
      .waitFor();
    assert.equal(
      await context.cookies().then((cookies) => cookies.length),
      0,
      "Demo tests must not use an authenticated session",
    );
    assert.equal(
      await state(),
      null,
      "A new browser context must start without persisted demo state",
    );
    await page
      .getByLabel("Studio version", { exact: true })
      .getByText(/v0\.3\.13/)
      .waitFor();
    await page.screenshot({
      path: "/tmp/studio-v2-desktop.png",
      fullPage: true,
    });

    // Layout and sidebar choices persist for this actor without changing content records.
    await page
      .getByRole("button", { name: "Production Board", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Your production board", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "Your production board", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Command Center", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Collapse sidebar", exact: true })
      .click();
    await page.reload();
    await page
      .getByRole("button", { name: "Expand sidebar", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Expand sidebar", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Unpin sidebar", exact: true })
      .click();
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page
      .getByRole("button", { name: "Pin sidebar", exact: true })
      .click();
    await navigate("Ideas");
    await page
      .getByRole("button", { name: "Generate with agent", exact: true })
      .click();
    await dialog()
      .getByLabel("Topic / Brief", { exact: true })
      .fill("Documenting recovery routines");
    await dialog()
      .getByLabel("Audience", { exact: true })
      .fill("Family caregivers");
    await dialog().getByLabel("Quantity", { exact: true }).fill("3");
    await dialog()
      .getByRole("button", { name: "Preview sample ideas", exact: true })
      .click();
    await dialog().getByRole("button",{name:"Close idea window",exact:true}).click();
    await dialog().waitFor({ state: "hidden" });
    const generated = (await state()).ideas.filter(
      (idea) => idea.origin === "demo_sample",
    );
    assert.equal(generated.length, 3);
    assert.ok(generated.every((idea) => idea.state === "pending"));
    await dismissNotice();

    // Account controls, theme persistence and non-publication calendar work.
    assert.equal(await page.title(), "Content Studio RyzaLab");
    const iconHref = await page
      .locator('link[rel="icon"]')
      .first()
      .getAttribute("href");
    assert.ok(iconHref?.includes("studio-icon.svg"));
    assert.equal(
      (await page.request.get(new URL(iconHref, baseURL).href)).status(),
      200,
    );
    await page
      .getByRole("button", { name: "Open profile", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Your account", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Daylight Teal", exact: true })
      .click();
    await page.reload();
    await page
      .getByRole("button", { name: "Open profile", exact: true })
      .click();
    assert.ok(
      await page
        .locator(".studio-v2")
        .evaluate((el) => el.classList.contains("s-theme-daylight")),
    );
    await page.screenshot({
      path: "/tmp/studio-daylight-account.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Midnight Teal", exact: true })
      .click();
    await navigate("Home");
    await page
      .getByRole("button", { name: "Open account and appearance", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Your account", exact: true })
      .waitFor();
    await navigate("Calendar");
    await page
      .getByRole("button", { name: "Add to calendar", exact: true })
      .click();
    await dialog()
      .getByLabel("What do you want to schedule?", { exact: true })
      .selectOption("Editing");
    await dialog()
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    await dialog()
      .getByLabel("Task title", { exact: true })
      .fill("QA editing appointment");
    const taskDay = new Date(Date.now() + 86400000 * 3);
    const taskDate = `${taskDay.getFullYear()}-${String(taskDay.getMonth() + 1).padStart(2, "0")}-${String(taskDay.getDate()).padStart(2, "0")}T11:00`;
    await dialog()
      .getByLabel(/Task time/)
      .fill(taskDate);
    await dialog()
      .getByRole("button", { name: "Save planning task", exact: true })
      .click();
    await dialog().waitFor({ state: "hidden" });
    const taskRow = page
      .locator(".s-planning-list .s-list-row")
      .filter({ hasText: "QA editing appointment" });
    await taskRow
      .getByRole("button", { name: "Open draft", exact: true })
      .click();
    await page.getByLabel("Content text", { exact: true }).waitFor();
    await navigate("Calendar");
    await taskRow
      .getByRole("button", { name: "Mark done", exact: true })
      .click();
    await taskRow.getByText(/done/).waitFor();
    await page
      .getByRole("button", { name: "Plan workflow", exact: true })
      .click();
    await dialog()
      .getByLabel("Task title", { exact: true })
      .fill("QA workflow appointment");
    await dialog()
      .getByLabel(/Task time/)
      .fill(taskDate);
    await dialog()
      .getByRole("button", { name: "Save planning task", exact: true })
      .click();
    await dialog().waitFor({ state: "hidden" });
    await page
      .locator(".s-planning-list .s-list-row")
      .filter({ hasText: "QA workflow appointment" })
      .getByRole("button", { name: "Open workflow", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Built around your brand", exact: true })
      .waitFor();
    await navigate("Analytics");
    await page
      .getByRole("heading", { name: "Content by channel", exact: true })
      .waitFor();
    await page.getByLabel("Activity period", { exact: true }).selectOption("7");
    await page.getByText("Not connected", { exact: true }).waitFor();
    await page.screenshot({
      path: "/tmp/studio-analytics.png",
      fullPage: true,
    });
    await dismissNotice();

    await navigate("Training & QA");
    await page
      .getByRole("heading", {
        name: "Training, testing and backlog",
        exact: true,
      })
      .waitFor();
    assert.equal(await page.locator(".s-training-links a").count(), 14);
    const qaFile = await saveDownload(
      () =>
        page
          .getByRole("link", { name: "Download QA workbook", exact: true })
          .click(),
      "manual-qa.xlsx",
    );
    const wordFile = await saveDownload(
      () =>
        page
          .getByRole("link", { name: "Calendar (Word)", exact: true })
          .click(),
      "calendar-training.docx",
    );
    assert.ok(fs.readFileSync(qaFile).subarray(0, 2).equals(Buffer.from("PK")));
    assert.ok(
      fs.readFileSync(wordFile).subarray(0, 2).equals(Buffer.from("PK")),
    );

    // An idea becomes a draft only after an explicit human approval.
    const title = "Browser verification — a thoughtful story";
    await navigate("Ideas");
    await page.getByRole("button", { name: "Add idea", exact: true }).click();
    await dialog().getByLabel("Idea title", { exact: true }).fill(title);
    await dialog()
      .getByLabel("What is the angle?", { exact: true })
      .fill(
        "An editorial perspective grounded in the team’s own working process.",
      );
    await dialog()
      .getByRole("button", { name: "Add idea", exact: true })
      .click();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    await page.reload();
    await navigate("Ideas");
    await page.getByRole("button", { name: "List", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "List", exact: true }).getAttribute("aria-pressed"), "true");
    const idea = page.locator(".s-idea-summary").filter({ hasText: title });
    await idea.click();
    const ideaDialog = page.locator(".s-idea-detail");
    await ideaDialog.getByText("An editorial perspective grounded in the team’s own working process.").waitFor();
    await ideaDialog.getByRole("button", { name: "Use idea & open draft", exact: true }).click();
    await page.getByLabel("Content text", { exact: true }).waitFor();
    await page
      .getByLabel("Content text", { exact: true })
      .fill(
        "A useful story from the team. We start with a clear question and make time for a thoughtful review.",
      );
    await saveDraft();
    const linkedDraftId = (await state()).contents.find((content) => content.title === title).id;
    await navigate("Ideas");
    await page.locator(".s-idea-summary").filter({ hasText: title }).click();
    await page.locator(".s-idea-detail").getByRole("button", { name: "Open linked draft", exact: true }).click();
    await page.getByLabel("Content text", { exact: true }).waitFor();
    assert.equal((await state()).contents.filter((content) => content.title === title).length, 1);
    assert.equal((await state()).contents.find((content) => content.title === title).id, linkedDraftId);
    await page.getByRole("button", { name: "Slides", exact: true }).click();
    await page.getByRole("button", { name: "Add slide", exact: true }).click();
    await page
      .getByLabel("Slide title", { exact: true })
      .fill("A clear creative direction");
    await page
      .getByLabel("Slide body", { exact: true })
      .fill("A thoughtful process, one story at a time.");
    await page
      .getByRole("button", { name: "Add text layer", exact: true })
      .click();
    await page
      .getByLabel("Layer text", { exact: true })
      .fill("A readable overlay for human review.");
    await page
      .getByRole("button", { name: "Select text layer", exact: true })
      .press("ArrowRight");
    await page
      .getByRole("button", { name: "Add shape layer", exact: true })
      .click();
    await page.getByLabel("Layer opacity", { exact: true }).fill("0.5");
    await page
      .getByRole("button", { name: "Send backward", exact: true })
      .click();
    await saveDraft();
    const saved = (await state()).contents.find(
      (content) => content.title === title,
    );
    assert.ok(saved.ideaId, "The draft must retain its approved idea link");
    assert.equal(saved.media.slides[0].layers.length, 2);
    assert.equal(saved.media.slides[0].layers[0].kind, "shape");
    assert.equal(saved.media.slides[0].layers[1].x, 11);
    assert.equal(saved.media.slides.length, 1);

    // Export actual editable source and real documents; no simulated downloads.
    const projectFile = await saveDownload(
      () =>
        page
          .getByRole("button", { name: "Complete project JSON", exact: true })
          .click(),
      "media-project.json",
    );
    const source = JSON.parse(fs.readFileSync(projectFile, "utf8"));
    assert.equal(source.format, "ryzalab-media");
    assert.equal(source.project.slides[0].title, "A clear creative direction");
    const slidePDF = await saveDownload(
      () => page.getByRole("button", { name: "PDF", exact: true }).click(),
      "slides.pdf",
    );
    assert.equal(fs.readFileSync(slidePDF).subarray(0, 4).toString(), "%PDF");
    await page
      .getByRole("button", { name: "Google Docs", exact: true })
      .click();
    const documentFile = await saveDownload(
      () =>
        page.getByRole("button", { name: "Export DOCX", exact: true }).click(),
      "content.docx",
    );
    assert.equal(fs.readFileSync(documentFile).subarray(0, 2).toString(), "PK");
    const documentPDF = await saveDownload(
      () =>
        page
          .getByRole("button", { name: "Export text PDF", exact: true })
          .click(),
      "content.pdf",
    );
    assert.equal(
      fs.readFileSync(documentPDF).subarray(0, 4).toString(),
      "%PDF",
    );

    // Demo connectors report what is unavailable and never pretend to connect.
    await page
      .getByRole("button", { name: "Connect Google Docs", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Demo mode does not simulate OAuth" })
      .waitFor();
    await closeError();
    await page
      .getByRole("button", { name: "Link document", exact: true })
      .click();
    await dialog()
      .getByLabel("Google document ID or URL", { exact: true })
      .fill("browser-demo-document-123");
    await dialog()
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await dialog().waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Fetch latest text", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Demo mode does not simulate a fetch" })
      .waitFor();
    await closeError();

    await page
      .getByRole("button", { name: "Submit for review", exact: true })
      .click();
    await navigate("Reviews");
    const review = page.locator(".s-review-card").filter({ hasText: title });
    assert.equal(await page.getByRole("dialog").count(), 0);
    const queueWidth = await page
      .locator(".s-review-grid")
      .evaluate((el) => el.getBoundingClientRect().width);
    assert.ok(
      await review.evaluate(
        (el, width) => el.getBoundingClientRect().width >= width * 0.95,
        queueWidth,
      ),
    );
    await review
      .getByRole("button", { name: "Open review", exact: true })
      .click();
    assert.equal(
      await review.locator(".s-stage-tracker").getAttribute("open"),
      null,
    );
    await page.screenshot({ path: "/tmp/studio-review-popup.png" });
    await review.locator(".s-stage-tracker > summary").click();
    await review.getByText(/Active workflow v1/).waitFor();
    for (const stage of [
      "Intake",
      "Evidence",
      "Creation",
      "Independent review",
      "Visual review",
      "Release check",
    ]) {
      await review
        .getByRole("button", { name: `Record ${stage} check`, exact: true })
        .click();
      const form = review.locator(".s-stage-form");
      await form
        .getByLabel("Reason / finding")
        .fill("Human inspected this exact version and selected media.");
      await form
        .getByLabel("Evidence / reviewer reference")
        .fill(
          "Human review: provided sources and current content inspected; no automated reviewer is claimed.",
        );
      if (stage === "Intake") {
        await page.evaluate(() =>
          document
            .querySelector(".studio-v2")
            .classList.add("s-theme-daylight"),
        );
        const save = form.getByRole("button", {
          name: "Save check",
          exact: true,
        });
        await save.hover();
        const colors = await save.evaluate((el) => ({
          color: getComputedStyle(el).color,
          background: getComputedStyle(el).backgroundColor,
        }));
        assert.notEqual(
          colors.color,
          colors.background,
          "Daylight save-button label stays visible on hover",
        );
        await page.screenshot({ path: "/tmp/studio-review-daylight.png" });
        await page.evaluate(() =>
          document
            .querySelector(".studio-v2")
            .classList.remove("s-theme-daylight"),
        );
      }
      await form
        .getByRole("button", { name: "Save check", exact: true })
        .click();
      await form.waitFor({ state: "hidden" });
    }
    await review
      .getByRole("button", { name: "Approve revision", exact: true })
      .click();
    await page.locator(".s-list-row").filter({ hasText: title }).waitFor();
    await openContent(title);
    assert.equal(
      await page.locator(".s-creative-direction").getAttribute("open"),
      null,
    );
    await page.locator(".s-creative-direction > summary").click();
    assert.ok(
      await page
        .locator(".s-creative-direction .s-panel-padding")
        .evaluate((el) => el.clientHeight <= innerHeight * 0.46),
    );
    await page.locator(".s-creative-direction > summary").click();
    await page.locator(".s-stage-tracker > summary").click();
    await page
      .getByRole("button", {
        name: "Record Publication handoff check",
        exact: true,
      })
      .click();
    const handoffForm = page.locator(".s-stage-form");
    await handoffForm
      .getByLabel("Reason / finding")
      .fill("Human prepared this exact approved package for publication.");
    await handoffForm
      .getByLabel("Evidence / reviewer reference")
      .fill("Exact approved package inspected.");
    await handoffForm
      .getByRole("button", { name: "Save check", exact: true })
      .click();
    await handoffForm.waitFor({ state: "hidden" });
    await navigate("Reviews");
    const approvedState = await state();
    const approved = approvedState.packages.find(
      (pkg) => pkg.contentId === saved.id,
    );
    assert.ok(
      approved?.hash && approved.approvedBy && approved.workflowSnapshot,
      "Human approval must retain an immutable package with workflow snapshot",
    );
    assert.equal(approved.ruleVersion, approvedState.settings.protectedVersion);
    assert.equal(
      approved.revision,
      approvedState.contents.find((content) => content.id === saved.id)
        .revision,
    );

    // Versioning a workflow never rewrites the already approved package.
    await navigate("Workflow settings");
    assert.equal(
      await page.locator("details.s-workflow-version[open]").count(),
      0,
    );
    const originalWorkflowTile = page
      .locator("details.s-workflow-version")
      .first();
    await originalWorkflowTile.locator("summary").click();
    await originalWorkflowTile
      .getByRole("button", { name: "Read instructions", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close instruction reader" })
      .waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(
      await originalWorkflowTile
        .getByRole("button", { name: "Read instructions", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await originalWorkflowTile.locator("summary").click();

    await page
      .getByRole("button", { name: "Edit workflow", exact: true })
      .click();
    await dialog()
      .getByLabel("Workflow name", { exact: true })
      .fill("LinkedIn workflow — browser revision");
    await dialog()
      .getByLabel("Creative instructions", { exact: true })
      .fill(
        "Create useful channel-specific perspectives. Preserve source meaning and the limits of available evidence.",
      );
    for (const kind of [
      "Research",
      "Ideas",
      "Text",
      "Review",
      "Image",
      "Video",
      "Audio",
    ])
      assert.equal(
        await dialog()
          .getByLabel(`${kind} connection`, { exact: true })
          .count(),
        1,
      );
    await dialog()
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    const workflowCard = page
      .locator(".s-workflow-version")
      .filter({ hasText: "LinkedIn workflow — browser revision" });
    assert.equal(await workflowCard.getAttribute("open"), null);
    assert.ok(
      await workflowCard.locator("time").first().getAttribute("datetime"),
    );
    assert.match(
      await workflowCard.locator("summary").innerText(),
      /Text: Not configured/i,
    );
    await workflowCard.locator("summary").click();
    const beforeReading = await state();
    await workflowCard
      .getByRole("button", { name: "Read instructions", exact: true })
      .click();
    const instructionReader = page.getByRole("dialog");
    assert.equal(
      await instructionReader.locator(".s-workflow-reader-copy").innerText(),
      "Create useful channel-specific perspectives. Preserve source meaning and the limits of available evidence.",
    );
    await page.screenshot({ path: "/tmp/studio-workflow-reader.png" });
    await instructionReader
      .getByRole("button", { name: "Close instruction reader" })
      .click();
    assert.deepEqual(
      await state(),
      beforeReading,
      "Reading a workflow cannot edit or activate it",
    );
    await page.screenshot({ path: "/tmp/studio-workflow-tiles.png" });
    await workflowCard
      .getByRole("button", { name: "Submit for review", exact: true })
      .click();
    await workflowCard
      .getByRole("button", { name: "Approve & activate", exact: true })
      .click();
    await page.waitForFunction(
      (key) =>
        JSON.parse(localStorage.getItem(key)).workflows.some(
          (workflow) =>
            workflow.title === "LinkedIn workflow — browser revision" &&
            workflow.status === "active",
        ),
      stateKey,
    );
    const retained = (await state()).packages.find(
      (pkg) => pkg.id === approved.id,
    );
    assert.deepEqual(
      retained,
      approved,
      "Activating a newer workflow must preserve the approved package byte-for-byte",
    );

    // A selected package is scheduled, then a person confirms that exact package.
    await navigate("Calendar");
    await page
      .locator(".s-calendar-ready-item")
      .filter({ hasText: title })
      .getByRole("button", { name: "Choose date and time", exact: true })
      .click();
    assert.equal(await dialog().getByLabel("Approved package").inputValue(), approved.id);
    const publicationTime = new Date(Date.now() + 2 * 86400000);
    const localDate = `${publicationTime.getFullYear()}-${String(publicationTime.getMonth() + 1).padStart(2, "0")}-${String(publicationTime.getDate()).padStart(2, "0")}T12:30`;
    await dialog()
      .getByLabel(/Publication time/)
      .fill(localDate);
    await dialog()
      .getByRole("button", { name: "Add to calendar", exact: true })
      .click();
    await dialog().waitFor({ state: "hidden" });
    await navigate("Calendar");
    await page.getByRole("button", { name: "Agenda", exact: true }).click();
    const scheduledRow = page
      .locator(".s-schedule-row")
      .filter({ hasText: title });
    const beforeCalendarPreview = await state();
    await scheduledRow.getByRole("button", { name: title, exact: true }).click();
    const calendarPreview = page.getByRole("dialog");
    await calendarPreview.getByRole("heading", { name: "Approved publication" }).waitFor();
    assert.equal(await calendarPreview.locator(".s-calendar-snapshot-copy").first().innerText(), approved.text);
    assert.equal(await calendarPreview.locator("textarea").count(), 0);
    await calendarPreview.getByRole("button", { name: "Close", exact: true }).click();
    assert.deepEqual(await state(), beforeCalendarPreview, "Opening a scheduled snapshot is read only");
    await scheduledRow
      .getByRole("button", { name: "Confirm published", exact: true })
      .click();
    await dialog()
      .getByText(new RegExp(`manually published revision ${approved.revision}`))
      .waitFor();
    await dialog()
      .getByLabel("Public publication URL", { exact: true })
      .fill("https://www.linkedin.com/posts/ryzalab-browser-verification");
    await dialog()
      .getByRole("button", { name: "Confirm published", exact: true })
      .click();
    await scheduledRow
      .getByText("Published · human confirmed", { exact: true })
      .waitFor();
    const published = (await state()).schedules.find(
      (schedule) => schedule.contentId === saved.id,
    );
    assert.equal(published.packageId, approved.id);
    assert.equal(published.verification, "human_confirmed");
    assert.ok(published.confirmedBy && published.confirmedAt);

    // A separate unresolved placeholder must be rejected by the approval gate.
    await navigate("Create");
    await page
      .getByRole("button", { name: "Create content", exact: true })
      .first()
      .click();
    await dialog()
      .getByLabel("Working title", { exact: true })
      .fill("Blocked placeholder verification");
    await dialog()
      .getByRole("button", { name: "Create draft", exact: true })
      .click();
    await openContent("Blocked placeholder verification");
    await page
      .getByLabel("Content text", { exact: true })
      .fill(
        "A perspective from the team. [source: verify this claim before publishing]",
      );
    await saveDraft();
    assert.equal(await page.getByRole("button", {name:"Submit for review",exact:true}).isDisabled(),true);
    await page.getByRole("region",{name:"Needs your input"}).waitFor();
    // Retain coverage for an unfinished review saved by an older release.
    const historical = await state();
    historical.contents.find(item=>item.title==="Blocked placeholder verification").state="review";
    await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:stateKey,value:historical});
    await page.reload();
    await navigate("Reviews");
    const blockedReview = page
      .locator(".s-review-card")
      .filter({ hasText: "Blocked placeholder verification" });
    await blockedReview
      .getByRole("button", { name: "Open review", exact: true })
      .click();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await blockedReview
      .getByRole("button", { name: "Open review", exact: true })
      .click();
    await blockedReview
      .getByRole("button", { name: "Approve revision", exact: true })
      .click();
    await page
      .getByRole("alert", { name: "Approval error" })
      .filter({
        hasText:
          "Resolve blocking factual claims and confirmation placeholders",
      })
      .waitFor();
    assert.match(
      await page.getByRole("alert", { name: "Approval error" }).innerText(),
      /\[source: verify this claim before publishing\]/,
    );
    const blocked = (await state()).contents.find(
      (content) => content.title === "Blocked placeholder verification",
    );
    assert.ok(
      !(await state()).packages.some((pkg) => pkg.contentId === blocked.id),
      "Unresolved placeholders must never acquire an approved package",
    );
    await page
      .getByRole("button", { name: "Close review", exact: true })
      .click();
    await closeError();

    // Saving demo provider metadata discards the entered credential; checking access
    // reports that real validation is unavailable rather than marking it validated.
    await navigate("AI & budgets");
    await page.locator('[data-budget-section="AI connections"] > summary').click();
    await page
      .getByRole("button", { name: "Add connection", exact: true })
      .click();
    await dialog()
      .getByLabel("Connection name", { exact: true })
      .fill("Browser demo metadata");
    await dialog()
      .getByLabel("Model identifier", { exact: true })
      .fill("demo-model-not-a-provider-call");
    await dialog()
      .getByLabel("API key", { exact: true })
      .fill("browser-secret-must-never-persist");
    await dialog()
      .getByRole("button", { name: "Save connection", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Check model access", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Provider validation requires a live workspace" })
      .waitFor();
    assert.ok(
      !(
        await page.evaluate((key) => localStorage.getItem(key), stateKey)
      ).includes("browser-secret-must-never-persist"),
    );
    assert.equal(
      (await state()).connections.find(
        (connection) => connection.title === "Browser demo metadata",
      ).status,
      "unverified",
    );
    await closeError();
    await page.locator('[data-budget-section="Generation activity"] > summary').click();
    await page
      .getByRole("button", { name: "Queue request", exact: true })
      .click();
    await dialog()
      .getByText("Active workflow binding", { exact: true })
      .waitFor();
    assert.equal(
      await dialog().getByLabel("Connection", { exact: true }).count(),
      0,
      "A request must not offer an arbitrary connection override",
    );
    await dialog().getByRole("button", { name: "Cancel", exact: true }).click();
    assert.deepEqual(
      connectorCalls,
      [],
      "Demo connector controls must never make external requests",
    );

    const connectionRow = page
      .locator(".s-connection-row")
      .filter({ hasText: "Browser demo metadata" });
    await connectionRow
      .getByRole("button", { name: "Edit allowance", exact: true })
      .click();
    await dialog()
      .getByLabel("Per-request allowance ($)", { exact: true })
      .fill("0.50");
    await dialog()
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await dialog().waitFor({ state: "hidden" });
    assert.equal(
      (await state()).connections.find(
        (c) => c.title === "Browser demo metadata",
      ).maxRequestCost,
      50,
    );
    await connectionRow
      .getByRole("button", {
        name: "Disconnect Browser demo metadata",
        exact: true,
      })
      .click();
    await dialog()
      .getByRole("button", { name: "Disconnect", exact: true })
      .click();
    await dialog().waitFor({ state: "hidden" });
    await connectionRow.getByText("Disconnected", { exact: true }).waitFor();
    assert.equal(
      await connectionRow
        .getByRole("button", { name: "Check model access", exact: true })
        .isDisabled(),
      true,
    );
    await connectionRow
      .getByRole("button", {
        name: "Delete Browser demo metadata",
        exact: true,
      })
      .click();
    await dialog()
      .getByRole("button", { name: "Delete connection", exact: true })
      .click();
    await dialog().waitFor({ state: "hidden" });
    assert.equal(
      (await state()).connections.some(
        (c) => c.title === "Browser demo metadata",
      ),
      false,
    );
    await navigate("Library");
    await page
      .getByRole("button", { name: "Export campaign / inventory", exact: true })
      .click();
    await dialog()
      .getByLabel("Include unapproved working copies", { exact: true })
      .check();
    const campaignFile = await saveDownload(
      () =>
        dialog()
          .getByRole("button", { name: "Download campaign ZIP", exact: true })
          .click(),
      "campaign.zip",
    );
    const { default: JSZip } = await import("jszip");
    const campaignZip = await JSZip.loadAsync(fs.readFileSync(campaignFile));
    assert.ok(campaignZip.file("inventory.csv"));
    assert.ok(campaignZip.file("manifest.json"));
    await dialog().waitFor({ state: "hidden" });

    // Every main surface remains usable on a narrow mobile viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    for (const name of [
      "Home",
      "Ideas",
      "Calendar",
      "Create",
      "Reviews",
      "Library",
      "Workflow settings",
      "People & access",
      "AI & budgets",
    ]) {
      await navigate(name);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Mobile ${name} must not overflow horizontally`,
      );
    }
    await page
      .getByRole("button", { name: "Notifications", exact: true })
      .click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Mobile notifications must not overflow",
    );
    await navigate("Library");
    for (const tab of ["References", "Templates", "History", "Trash"]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Mobile library ${tab} must not overflow`,
      );
    }

    // Capture a clean dashboard rather than leaving an unresolved claim as the
    // primary screenshot. A second isolated context has the untouched demo seed.
    const cleanContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const cleanPage = await cleanContext.newPage();
    await cleanPage.goto(baseURL);
    await cleanPage
      .getByRole("heading", {
        name: "Your campaign command center",
        exact: true,
      })
      .waitFor();
    await cleanPage.screenshot({
      path: "/tmp/studio-v2-mobile-clean.png",
      fullPage: true,
    });
    assert.ok(
      await cleanPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await cleanContext.close();

    // The API enforces authentication independently of the demo browser UI.
    for (const endpoint of [
      "/api/studio",
      "/api/studio/connections",
      "/api/studio/connections/validate",
      "/api/studio/founder",
      "/api/studio/pricing",
      "/api/studio/research/setup",
      "/api/studio/connections/models",
      "/api/studio/docs",
      "/api/studio/google/connect",
      "/api/studio/assets",
      "/api/invite",
    ]) {
      const response = await context.request.post(`${baseURL}${endpoint}`, {
        data: {},
      });
      assert.ok(
        [401, 403, 503].includes(response.status()),
        `${endpoint} must reject unauthenticated calls; received ${response.status()}`,
      );
    }
    const health = await context.request.get(`${baseURL}/api/studio/health`);
    assert.ok(
      [401, 403, 503].includes(health.status()),
      "Health endpoint must reject unauthenticated access",
    );
    for (const endpoint of ["/api/generate", "/api/images", "/api/review"]) {
      const response = await context.request.post(`${baseURL}${endpoint}`, {
        data: {},
      });
      assert.equal(
        response.status(),
        410,
        `${endpoint} must keep the legacy generation path disabled`,
      );
    }
    // Isolated synthetic UI states only: these do not call or simulate a paid provider.
    const progressContext = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
    });
    try {
      const progressPage = await progressContext.newPage();
      progressPage.on("pageerror", (e) => errors.push(e.message));
      const fixture = await state();
      const actorEmail = fixture.members.find((m) =>
        m.roles.includes("founder"),
      ).email;
      fixture.settings.monthlyCap = 50000;
      fixture.settings.requestCap = 5000;
      fixture.settings.functionCaps = {};
      fixture.settings.userCaps = {};
      fixture.settings.roleCaps = {};
      fixture.settings.channelCaps = {};
      fixture.settings.accountCaps = {};
      fixture.settings.projectCaps = {};
      fixture.jobs = [
        {
          id: "ui-progress-only",
          kind: "ideas",
          channel: "LinkedIn",
          prompt: "UI fixture only; no provider call",
          connectionId: "fixture-connection",
          estimate: 5,
          reserved: 0,
          state: "awaiting_confirmation",
          attempt: 0,
          idempotencyKey: "fixture-only",
          createdBy: actorEmail,
          createdAt: new Date().toISOString(),
        },
      ];
      await progressPage.goto(baseURL);
      await progressPage.evaluate(
        ({ key, fixture }) =>
          localStorage.setItem(key, JSON.stringify(fixture)),
        { key: stateKey, fixture },
      );
      await progressPage.reload();
      const openIdeas = async () =>
        progressPage
          .locator(".s-sidebar nav")
          .getByRole("button", { name: "Ideas", exact: true })
          .click();
      await openIdeas();
      await progressPage
        .getByText("LinkedIn · Waiting for your cost confirmation", {
          exact: true,
        })
        .waitFor();
      assert.equal(await progressPage.getByRole("progressbar").count(), 0);
      await progressPage
        .getByRole("button", {
          name: "Confirm idea generation $0.05",
          exact: true,
        })
        .click();
      await progressPage
        .getByText("LinkedIn · Queued — waiting for worker", { exact: true })
        .waitFor();
      await progressPage.getByRole("progressbar").waitFor();
      async function transition(jobState, ideas = []) {
        await progressPage.evaluate(
          ({ key, jobState, ideas }) => {
            const s = JSON.parse(localStorage.getItem(key));
            s.jobs[0].state = jobState;
            s.ideas.push(...ideas);
            localStorage.setItem(key, JSON.stringify(s));
          },
          { key: stateKey, jobState, ideas },
        );
        await progressPage.reload();
        await openIdeas();
      }
      await transition("running");
      await progressPage
        .getByText("LinkedIn · Agent is generating ideas", { exact: true })
        .waitFor();
      await progressPage.evaluate((key) => {
        const s = JSON.parse(localStorage.getItem(key));
        s.jobs[0].result = JSON.stringify({
          ideas: [
            {
              title: "UI fixture — imported idea",
              brief: "Synthetic saved response, not an actual provider call.",
              audience: "Test readers",
              format:
                "A descriptive LinkedIn format with a checklist and optional visual, intentionally longer than the old one-hundred-and-fifty-character format field limit for regression coverage.",
              sources: ["brand-brain.md (Approved reference section)"],
            },
          ],
        });
        localStorage.setItem(key, JSON.stringify(s));
      }, stateKey);
      await transition("succeeded");
      await progressPage
        .getByText("LinkedIn · Provider finished — result needs attention", {
          exact: true,
        })
        .waitFor();
      await progressPage
        .getByRole("button", {
          name: "Import saved ideas — no AI call",
          exact: true,
        })
        .click();
      await progressPage
        .getByText("LinkedIn · 1 ideas ready for review", { exact: true })
        .waitFor();
      await progressPage
        .getByRole("heading", {
          name: "UI fixture — imported idea",
          exact: true,
        })
        .waitFor();
      await transition("blocked");
      await progressPage
        .getByText("LinkedIn · Generation blocked", { exact: true })
        .waitFor();
      assert.equal(
        await progressPage
          .getByRole("button", { name: /Confirm idea generation/ })
          .count(),
        0,
      );
      // Fake browser clock verifies expiry and identical-message timer restart without sleeping.
      await progressPage.clock.install();
      const addToastIdea = async (title) => {
        await progressPage
          .getByRole("button", { name: "Add idea", exact: true })
          .click();
        const modal = progressPage.getByRole("dialog");
        await modal.getByLabel("Idea title", { exact: true }).fill(title);
        await modal
          .getByLabel("What is the angle?", { exact: true })
          .fill("Toast timer UI fixture");
        await modal
          .getByRole("button", { name: "Add idea", exact: true })
          .click();
        await modal.waitFor({ state: "hidden" });
      };
      await addToastIdea("Toast timer first fixture");
      await progressPage.locator(".s-toast").waitFor();
      await progressPage.clock.fastForward(6000);
      await addToastIdea("Toast timer second fixture");
      await progressPage.clock.fastForward(5000);
      assert.equal(await progressPage.locator(".s-toast").isVisible(), true);
      await progressPage.clock.fastForward(6000);
      assert.equal(await progressPage.locator(".s-toast").count(), 0);
      await progressPage
        .getByRole("button", { name: "Operations", exact: true })
        .click();
      await progressPage
        .getByRole("heading", { name: "Operations and incidents", exact: true })
        .waitFor();
      await progressPage.getByText(/Worker heartbeat is not tracked/).waitFor();
      const target = await progressPage.evaluate((key) => {
        const s = JSON.parse(localStorage.getItem(key));
        const c = s.contents[0];
        c.docId = "ui-document";
        c.docsIncoming = {
          text: "Incoming Google Docs UI fixture",
          fetchedAt: "2026-10-28T18:00:00Z",
          reason: "Both branches changed; compare before import.",
        };
        localStorage.setItem(key, JSON.stringify(s));
        return { id: c.id, title: c.title, packages: s.packages };
      }, stateKey);
      await progressPage.reload();
      await progressPage
        .locator(".s-sidebar nav")
        .getByRole("button", { name: "Create", exact: true })
        .click();
      await progressPage
        .locator(".s-content-title")
        .filter({ hasText: target.title })
        .click();
      await progressPage
        .getByRole("button", { name: "Google Docs", exact: true })
        .click();
      await progressPage
        .getByRole("heading", {
          name: "Google Docs changes need review",
          exact: true,
        })
        .waitFor();
      await progressPage
        .getByRole("button", { name: "Import incoming text", exact: true })
        .click();
      await progressPage
        .getByRole("dialog")
        .getByRole("button", { name: "Import incoming text", exact: true })
        .click();
      await progressPage.getByRole("dialog").waitFor({ state: "hidden" });
      const merged = await progressPage.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)),
        stateKey,
      );
      assert.equal(
        merged.contents.find((c) => c.id === target.id).text,
        "Incoming Google Docs UI fixture",
      );
      assert.deepEqual(merged.packages, target.packages);
      // Editing/removing workflow bindings preserves existing active policy and credentials.
      const connectionFixture = await progressPage.evaluate((key) => {
        const s = JSON.parse(localStorage.getItem(key));
        const w = s.workflows.find(
          (w) => w.channel === "LinkedIn" && w.status === "active",
        );
        s.connections.push({
          id: "ui-disconnected-text",
          title: "Disconnected writing",
          provider: "anthropic",
          model: "fixture",
          function: "text",
          status: "disconnected",
          hasKey: false,
          allowance: 0,
          updatedAt: "2026-10-29T00:00:00Z",
        });
        w.functionConnections = {
          ...w.functionConnections,
          text: "ui-disconnected-text",
        };
        w.connectionId = "ui-disconnected-text";
        localStorage.setItem(key, JSON.stringify(s));
        return { workflow: w, connections: s.connections };
      }, stateKey);
      await progressPage.reload();
      await progressPage
        .locator(".s-sidebar nav")
        .getByRole("button", { name: "Workflow settings", exact: true })
        .click();
      assert.equal(
        await progressPage.locator("details.s-workflow-version[open]").count(),
        0,
      );
      const bindingTile = progressPage
        .locator("details.s-workflow-version")
        .filter({ hasText: "Disconnected writing" })
        .first();
      await bindingTile.locator("summary").click();
      await bindingTile
        .getByRole("button", { name: "Edit connections", exact: true })
        .click();
      assert.equal(
        await progressPage
          .getByRole("dialog")
          .getByLabel("Text connection", { exact: true })
          .inputValue(),
        "ui-disconnected-text",
      );
      await progressPage
        .getByRole("dialog")
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await progressPage.getByRole("dialog").waitFor({ state: "hidden" });
      const preserved = await progressPage.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)),
        stateKey,
      );
      assert.equal(
        preserved.workflows[0].functionConnections.text,
        "ui-disconnected-text",
      );
      assert.deepEqual(
        preserved.workflows.find((w) => w.id === connectionFixture.workflow.id),
        connectionFixture.workflow,
      );
      const editingTile = progressPage
        .locator("details.s-workflow-version")
        .first();
      await editingTile.locator("summary").click();
      await editingTile
        .getByRole("button", { name: "Edit connections", exact: true })
        .click();
      await progressPage
        .getByRole("dialog")
        .getByLabel("Text connection", { exact: true })
        .selectOption("");
      await progressPage
        .getByRole("dialog")
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await progressPage.getByRole("dialog").waitFor({ state: "hidden" });
      const removed = await progressPage.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)),
        stateKey,
      );
      assert.equal(removed.workflows[0].status, "draft");
      assert.equal(
        removed.workflows[0].id,
        preserved.workflows[0].id,
        "Draft editing stays on the same revision",
      );
      assert.equal(
        removed.workflows.length,
        preserved.workflows.length,
        "Draft edits do not accumulate versions",
      );
      assert.ok(removed.workflows[0].updatedAt);
      assert.equal(removed.workflows[0].functionConnections.text, undefined);
      assert.equal(removed.workflows[0].connectionId, "");
      assert.equal(
        removed.workflows[0].instructions,
        connectionFixture.workflow.instructions,
      );
      assert.deepEqual(removed.connections, connectionFixture.connections);
      assert.deepEqual(removed.packages, target.packages);
      assert.deepEqual(
        removed.workflows.find((w) => w.id === connectionFixture.workflow.id),
        connectionFixture.workflow,
      );
      await progressPage.setViewportSize({ width: 390, height: 844 });
      const mobileWorkflow = progressPage
        .locator("details.s-workflow-version")
        .first();
      if ((await mobileWorkflow.getAttribute("open")) === null)
        await mobileWorkflow.locator("summary").click();
      assert.equal(
        await progressPage
          .locator(".s-workflow-versions")
          .first()
          .locator(":scope > details.s-workflow-version")
          .count(),
        1,
      );
      await progressPage
        .getByRole("button", { name: "Read instructions", exact: true })
        .first()
        .click();
      await progressPage.screenshot({
        path: "/tmp/studio-workflow-reader-mobile.png",
      });
      assert.ok(
        await progressPage
          .getByRole("dialog")
          .evaluate((el) => el.getBoundingClientRect().right <= innerWidth),
      );
      await progressPage.keyboard.press("Escape");
    } finally {
      await progressContext.close();
    }
    assert.deepEqual(
      errors,
      [],
      "The browser should have no uncaught runtime errors",
    );
    console.log(
      "PASS: account/theme persistence, tab branding, calendar planning and target opening, analytics, training downloads, idea persistence, exact approval/handoff, manual publication, exports, mobile navigation, and API protection.",
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
