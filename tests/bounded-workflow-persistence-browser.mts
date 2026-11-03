import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
const fixture = initialState(DEMO_ACTOR, true);
fixture.settings.qualifiedRates = [];
for (const id of ["first", "second"])
  fixture.connections.push({
    id,
    title: `Stored ${id} writing connection`,
    provider: "anthropic",
    function: "text",
    model: "claude-sonnet-5-5",
    hasKey: true,
    status: "validated",
    updatedAt: "2026-11-02T12:00:00Z",
  });
const script = await build({
  stdin: {
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{BoundedWorkflowSetup}from'./components/bounded-workflow-setup';import{saveBoundedWorkflowSetup}from'./lib/studio/bounded-workflow-setup';const actor=${JSON.stringify(DEMO_ACTOR)},initial=${JSON.stringify(fixture)};window.calls=[];function App(){const[state,setState]=useState(()=>JSON.parse(localStorage.getItem('saved-workflow')||JSON.stringify(initial))),[page,setPage]=useState('setup');async function request(body){window.calls.push(body);setState(previous=>{const next=saveBoundedWorkflowSetup(previous,actor,body,{model:'claude-sonnet-5-5',maxInputTokens:1000000,maxOutputTokens:128000},'2026-11-02T12:00:00Z');localStorage.setItem('saved-workflow',JSON.stringify(next));return next;});}return <><button onClick={()=>setPage('other')}>Other page</button><button onClick={()=>setPage('setup')}>Setup page</button>{page==='setup'?<BoundedWorkflowSetup state={state} request={request} disabled={false} demo={false}/>:<p>Another page</p>}</>};createRoot(document.getElementById('app')).render(<App/>);`,
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
  await page.route("http://localhost:31342/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<div id="app"></div><script>' +
        script.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    }),
  );
  await page.goto("http://localhost:31342/");
  const checkbox = () =>
    page.getByRole("checkbox", {
      name: /Use this connection for LinkedIn and Newsletter/,
    });
  await page
    .getByLabel("Writing connection", { exact: true })
    .selectOption("second");
  await checkbox().check();
  await page
    .getByRole("status")
    .filter({ hasText: /This selection has not been saved/ })
    .waitFor();
  assert.equal((await page.evaluate(() => (window as any).calls)).length, 0);
  await page.getByRole("button", { name: "Other page", exact: true }).click();
  await page.getByRole("button", { name: "Setup page", exact: true }).click();
  assert.equal(
    await checkbox().isChecked(),
    false,
    "unsaved ticks must not be presented as saved setup",
  );
  await page
    .getByLabel("Writing connection", { exact: true })
    .selectOption("second");
  await checkbox().check();
  await page
    .getByRole("button", {
      name: "Check model and enable bounded workflow",
      exact: true,
    })
    .click();
  await page
    .getByRole("status")
    .filter({
      hasText: "Saved for LinkedIn and Newsletter ideas, writing and review.",
    })
    .waitFor();
  assert.equal(await checkbox().isChecked(), true);
  await page.getByRole("button", { name: "Other page", exact: true }).click();
  await page.getByRole("button", { name: "Setup page", exact: true }).click();
  assert.equal(await checkbox().isChecked(), true);
  assert.equal(
    await page.getByLabel("Writing connection", { exact: true }).inputValue(),
    "second",
  );
  assert.equal(
    (await page.evaluate(() => (window as any).calls)).length,
    1,
    "page return must not repeat setup/model requests",
  );
  await page.reload();
  await page
    .getByRole("status")
    .filter({ hasText: /Saved for LinkedIn and Newsletter/ })
    .waitFor();
  assert.equal(await checkbox().isChecked(), true);
  assert.equal(
    await page.getByLabel("Writing connection", { exact: true }).inputValue(),
    "second",
  );
  assert.equal(
    (await page.evaluate(() => (window as any).calls)).length,
    0,
    "reload must read saved mappings without setup calls",
  );
  assert.equal(await checkbox().isDisabled(),false);
  await checkbox().uncheck();
  await page.getByRole("button",{name:"Check model and enable bounded workflow",exact:true}).click();
  await page.getByText(/Model access checked/).waitFor();
  await page.getByRole("button", { name: "Other page", exact: true }).click();
  await page.getByRole("button", { name: "Setup page", exact: true }).click();
  assert.equal(await checkbox().isChecked(),false);
  await page.reload();assert.equal(await checkbox().isChecked(),false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: unsaved tick warning, saved selection/default model survives navigation and reload, no repeated model calls; local fixtures only",
  );
} finally {
  await browser.close();
}
