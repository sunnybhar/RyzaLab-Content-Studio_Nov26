import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const script = await build({
  stdin: {
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{AuthorizedJobProgress}from'./components/authorized-job-progress';window.calls=[];function App(){const[state,setState]=useState({jobs:[{id:'other',kind:'review',createdBy:'other@example.com',state:'queued'},{id:'sample',kind:'text',createdBy:'owner@example.com',state:'queued'},{id:'review',kind:'review',createdBy:'owner@example.com',state:'queued'}],verificationRuns:[{cases:[{writingJobId:'sample'}]}]});return <AuthorizedJobProgress state={state} actor={{email:'owner@example.com'}} demo={false} refresh={async()=>{}} request={async(id)=>{window.calls.push(id);if(window.calls.length===1)throw new Error('Execution unavailable. Inspect the saved request.');setState(s=>({...s,jobs:s.jobs.map(j=>j.id===id?{...j,state:'succeeded'}:j)}));}}/>};createRoot(document.getElementById('app')).render(<App/>);`,
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
  await page.route("http://localhost:31340/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<div id="app"></div><script>' +
        script.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    }),
  );
  await page.goto("http://localhost:31340/");
  await page
    .getByRole("button", { name: "Check queued request again" })
    .waitFor();
  assert.deepEqual(await page.evaluate(() => (window as any).calls), [
    "review",
  ]);
  await page
    .getByRole("button", { name: "Check queued request again" })
    .click();
  await page.getByRole("status").waitFor({ state: "detached" });
  assert.deepEqual(await page.evaluate(() => (window as any).calls), [
    "review",
    "review",
  ]);
  console.log(
    "PASS: only owner queued review progresses; other-user and sample jobs excluded; errors stop until explicit recheck; local fixtures only",
  );
} finally {
  await browser.close();
}
