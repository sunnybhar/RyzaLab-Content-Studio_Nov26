import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const script = await build({
  stdin: {
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{JobCost,PostCost}from'./components/job-cost';const job={id:'one',contentId:'post',estimate:16,reserved:0,actual:3,costBasis:'provider_usage',providerUsage:{inputTokens:10000,outputTokens:1000,cacheReadTokens:0,cacheCreationTokens:0}},state={jobs:[job,{contentId:'post',reserved:16}],contents:[{id:'post',preparationId:'allowance'}],preparations:[{id:'allowance',maxCents:50}],settings:{reviewPolicy:{packageCap:200}}};createRoot(document.getElementById('app')).render(<><PostCost state={state} contentId="post"/><JobCost job={job}/></>);`,
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
  await page.route("http://localhost:31341/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<div id="app"></div><script>' +
        script.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    }),
  );
  await page.goto("http://localhost:31341/");
  await page
    .getByText(
      "Post allowance: $0.50 · Recorded: $0.03 · Reserved: $0.16 · Remaining: $0.31.",
      { exact: true },
    )
    .waitFor();
  await page.getByText("Usage and cost details", { exact: true }).click();
  await page
    .getByText("Input: 10,000 tokens · Output: 1,000 tokens.", { exact: true })
    .waitFor();
  await page.getByText(/This is not an invoice/).waitFor();
  assert.equal(
    await page.getByRole("button").count(),
    0,
    "cost display must not trigger new paid calls",
  );
  console.log(
    "PASS: recorded/held/remaining budget, provider token counts and non-invoice label; local fixtures only",
  );
} finally {
  await browser.close();
}
