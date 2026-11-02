import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
const fixture = initialState(DEMO_ACTOR, true);
fixture.connections.push({
  id: "writing",
  title: "Stored writing key",
  provider: "anthropic",
  function: "text",
  model: "claude-sonnet-5-5",
  hasKey: true,
  status: "unverified",
  updatedAt: "2026-11-02T12:00:00Z",
});
const script = await build({
  stdin: {
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{BoundedWorkflowSetup}from'./components/bounded-workflow-setup';const state=${JSON.stringify(fixture)};window.calls=[];createRoot(document.getElementById('app')).render(<BoundedWorkflowSetup state={state} disabled={false} demo={false} request={async(body)=>{window.calls.push(body);if(window.fail)throw new Error('Model metadata unavailable. No paid request sent.');return {ok:true}}}/>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("http://localhost:31338/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<div id="app"></div><script>' +
        script.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    }),
  );
  await page.goto("http://localhost:31338/");
  assert.equal(
    await page.getByRole("textbox").count(),
    0,
    "setup must not ask for API key or a manually guessed price",
  );
  await page
    .getByLabel("Writing connection", { exact: true })
    .selectOption("writing");
  await page
    .getByRole("button", { name: "Check model and enable bounded workflow" })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: /No paid generation was run/ })
    .waitFor();
  assert.deepEqual(await page.evaluate(() => (window as any).calls), [
    { connectionId: "writing", expectedVersion: fixture.version, channels: [] },
  ]);
  await page.getByRole("checkbox",{name:/Use this connection for LinkedIn and Newsletter/}).check();
  await page.evaluate(() => {
    (window as any).fail = true;
  });
  await page
    .getByRole("button", { name: "Check model and enable bounded workflow" })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: /Model metadata unavailable/ })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: one-action stored-key bounded setup, no guessed price/API-key fields, honest success/failure; local setup fixtures only",
  );
} finally {
  await browser.close();
}
