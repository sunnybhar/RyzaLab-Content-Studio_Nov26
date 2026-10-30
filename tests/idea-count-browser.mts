import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
const state = initialState(DEMO_ACTOR, true);
const now = new Date().toISOString();
for (const [jobId, count] of [
  ["short-batch", 1],
  ["complete-batch", 4],
] as const) {
  state.jobs.push({
    id: jobId,
    kind: "ideas",
    channel: "LinkedIn",
    prompt: JSON.stringify({ quantity: 4 }),
    connectionId: "test",
    estimate: 14,
    reserved: 14,
    state: "succeeded",
    attempt: 1,
    idempotencyKey: jobId,
    createdBy: DEMO_ACTOR.email,
    createdAt: now,
  });
  for (let i = 0; i < count; i++)
    state.ideas.push({
      id: `${jobId}-${i}`,
      title: `Idea ${i + 1}`,
      brief: "Useful local fixture",
      channel: "LinkedIn",
      state: "pending",
      createdBy: DEMO_ACTOR.email,
      createdAt: now,
      sources: [],
      generationRunId: jobId,
    });
}
const result = await build({
  stdin: {
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{IdeaGenerationStatus}from'./components/idea-generation-status';createRoot(document.getElementById('app')).render(<IdeaGenerationStatus state={${JSON.stringify(state)}} actor={${JSON.stringify(DEMO_ACTOR)}} channel="All channels" live={false} refresh={async()=>{}} send={async()=>{throw Error('No commands in fixture')}}/>);`,
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
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.route("http://idea-count.invalid/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<div id="app"></div><script>' +
        result.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    }),
  );
  await page.goto("http://idea-count.invalid/");
  await page.getByText(/1 of 4 requested ideas imported/).waitFor();
  await page.getByText(/4 ideas ready for review/).waitFor();
  assert.equal(await page.locator(".s-idea-job").count(), 2);
  console.log(
    "PASS: incomplete historical count shown accurately; complete four-card batch shows success; no provider calls",
  );
} finally {
  await browser.close();
}
