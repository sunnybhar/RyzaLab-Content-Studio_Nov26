import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { ROLES } from "../lib/studio/types";
const fixture = initialState(DEMO_ACTOR, true);
fixture.members[0].roles = ["administrator"];
fixture.members.push({
  id: "other-founder",
  email: "other@example.com",
  roles: ["founder"],
  grants: [],
  revoked: false,
});
const key = "ryzalab-studio-v2";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const calls: string[] = [];
  await page.route("**/api/studio/**", (route) => {
    calls.push(route.request().url());
    return route.abort();
  });
  await page.addInitScript(
    ({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)),
    { key, fixture },
  );
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:3015") + "/preview",
  );
  await page
    .locator(".s-sidebar nav")
    .getByRole("button", { name: "People & access", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Set up founder access", exact: true })
    .waitFor();
  await page
    .locator(".s-member-row")
    .filter({ hasText: "other@example.com" })
    .getByRole("button", { name: "Edit access", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  assert.equal(await dialog.getByRole("checkbox").count(), 6);
  for (const input of await dialog.getByRole("checkbox").all()) {
    assert.equal(await input.isDisabled(), false);
    await input.check();
  }
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "Set up founder access", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Confirm founder access", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  let saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  assert.ok(saved.members[0].roles.includes("founder"));
  assert.equal(saved.members[1].roles.length, 6);
  assert.equal(saved.settings.monthlyCap, fixture.settings.monthlyCap);
  assert.equal(saved.settings.reviewPolicy, undefined);
  assert.equal(saved.jobs.length, 0);
  await page
    .locator(".s-member-row")
    .filter({ hasText: DEMO_ACTOR.email })
    .getByRole("button", { name: "Edit access", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  for (const input of await dialog.getByRole("checkbox").all())
    await input.check();
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  assert.deepEqual([...saved.members[0].roles].sort(), [...ROLES].sort());
  assert.equal(calls.length, 0);
  await page
    .locator(".s-sidebar nav")
    .getByRole("button", { name: "AI & budgets", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Set up two-step review", exact: true })
    .waitFor();
  console.log(
    "PASS: admin edits founder/all roles and confirms own founder access directly in People; no email setting, budget change or live calls",
  );
} finally {
  await browser.close();
}
