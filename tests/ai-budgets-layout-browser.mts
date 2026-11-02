import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3056";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors: string[] = [],
    calls: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/studio/**", (route) => {
    calls.push(route.request().url());
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "No live calls allowed in layout test." }),
    });
  });
  await page.goto(base);
  await page
    .locator(".s-sidebar nav")
    .getByText("AI & budgets", { exact: true })
    .click();
  const panels = page.locator(".s-budget-layout > details");
  await panels.first().waitFor();
  assert.equal(await panels.count(), 10);
  assert.equal(
    await page.locator(".s-budget-layout > details[open]").count(),
    0,
  );
  assert.equal(
    await page.locator(".s-budget-section-body").count(),
    0,
    "collapsed sections must not mount forms/progress effects",
  );
  const gap = await panels.evaluateAll((nodes) =>
    nodes
      .slice(1)
      .map(
        (node, i) =>
          node.getBoundingClientRect().top -
          nodes[i].getBoundingClientRect().bottom,
      ),
  );
  assert.ok(
    gap.every((n) => n >= 20),
    "sections need clear desktop spacing",
  );
  await page.screenshot({
    path: "/tmp/ryzalab-budget-layout-0312.png",
    fullPage: true,
  });
  const setup = page.locator(
    '[data-budget-section="Bounded research and writing"] > summary',
  );
  await setup.click();
  await page.getByLabel("Writing connection", { exact: true }).waitFor();
  await setup.click();
  await page
    .getByLabel("Writing connection", { exact: true })
    .waitFor({ state: "detached" });
  await setup.focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Writing connection", { exact: true }).waitFor();
  await page
    .locator(".s-sidebar nav")
    .getByText("Home", { exact: true })
    .click();
  await page
    .locator(".s-sidebar nav")
    .getByText("AI & budgets", { exact: true })
    .click();
  assert.equal(
    await page.locator(".s-budget-layout > details[open]").count(),
    0,
    "page return starts collapsed",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () =>
      document.querySelector(".s-sidebar")!.getBoundingClientRect().right <= 1,
  );
  await page.screenshot({
    path: "/tmp/ryzalab-budget-layout-mobile-0312.png",
    fullPage: true,
  });
  const mobile = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
  }));
  assert.ok(
    mobile.width <= mobile.viewport + 1,
    "mobile settings must not overflow horizontally",
  );
  assert.deepEqual(errors, []);
  assert.equal(calls.length, 0, "opening settings must not call providers");
  console.log(
    "PASS: all ten AI budget sections collapsed by default, clear spacing, keyboard expansion, remount collapse and mobile width; no live calls",
  );
} finally {
  await browser.close();
}
