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
    await dialog().waitFor({ state: "hidden" });
    const generated = (await state()).ideas.filter(
      (idea) => idea.origin === "demo_sample",
    );
    assert.equal(generated.length, 3);
    assert.ok(generated.every((idea) => idea.state === "pending"));
    await dismissNotice();

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
    const idea = page.locator(".s-idea-card").filter({ hasText: title });
    await idea.getByRole("button", { name: "Approve", exact: true }).click();
    await idea
      .getByRole("button", { name: "Create content", exact: true })
      .click();
    await dialog()
      .getByRole("button", { name: "Create draft", exact: true })
      .click();
    await openContent(title);
    await page
      .getByLabel("Content text", { exact: true })
      .fill(
        "A useful story from the team. We start with a clear question and make time for a thoughtful review.",
      );
    await saveDraft();
    await page.getByRole("button", { name: "Slides", exact: true }).click();
    await page.getByRole("button", { name: "Add slide", exact: true }).click();
    await page
      .getByLabel("Slide title", { exact: true })
      .fill("A clear creative direction");
    await page
      .getByLabel("Slide body", { exact: true })
      .fill("A thoughtful process, one story at a time.");
    await saveDraft();
    const saved = (await state()).contents.find(
      (content) => content.title === title,
    );
    assert.ok(saved.ideaId, "The draft must retain its approved idea link");
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
      await form
        .getByRole("button", { name: "Save check", exact: true })
        .click();
      await form.waitFor({ state: "hidden" });
    }
    await review
      .getByRole("button", { name: "Approve revision", exact: true })
      .click();
    await page.locator(".s-list-row").filter({ hasText: title }).waitFor();
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
    await page
      .getByRole("button", { name: "New version", exact: true })
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
      .getByRole("button", { name: "Save draft version", exact: true })
      .click();
    const workflowCard = page
      .locator(".s-workflow-version")
      .filter({ hasText: "LinkedIn workflow — browser revision" });
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
    await navigate("Reviews");
    await page
      .locator(".s-list-row")
      .filter({ hasText: title })
      .getByRole("button", { name: "Plan publication", exact: true })
      .click();
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
    await page
      .getByRole("button", { name: "Submit for review", exact: true })
      .click();
    await navigate("Reviews");
    await page
      .locator(".s-review-card")
      .filter({ hasText: "Blocked placeholder verification" })
      .getByRole("button", { name: "Approve revision", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({
        hasText:
          "Resolve blocking factual claims and confirmation placeholders",
      })
      .waitFor();
    const blocked = (await state()).contents.find(
      (content) => content.title === "Blocked placeholder verification",
    );
    assert.ok(
      !(await state()).packages.some((pkg) => pkg.contentId === blocked.id),
      "Unresolved placeholders must never acquire an approved package",
    );
    await closeError();

    // Saving demo provider metadata discards the entered credential; checking access
    // reports that real validation is unavailable rather than marking it validated.
    await navigate("AI & budgets");
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
    assert.deepEqual(
      errors,
      [],
      "The browser should have no uncaught runtime errors",
    );
    console.log(
      "PASS: v2 idea persistence, human review, immutable packages/workflows, manual scheduling/confirmation, blocked placeholders, JSON/DOCX/PDF exports, honest demo connectors, mobile navigation, and unauthenticated/legacy API protection.",
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
