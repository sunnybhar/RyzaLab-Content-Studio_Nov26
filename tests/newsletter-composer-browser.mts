import {build} from 'esbuild';import {chromium}from'playwright';import assert from'node:assert/strict';import fs from'node:fs/promises';import{initialState,DEMO_ACTOR}from'../lib/studio/seed';
const fixture = initialState(DEMO_ACTOR, true);
const [post] = fixture.contents;
fixture.contents = [
  { ...post, title: "Existing post for combined issue" },
  { ...post, id: "published-post", title: "Published post for combined issue" },
];
fixture.schedules = [{
  id: "published-schedule", contentId: "published-post", state: "published",
  at: post.updatedAt, owner: DEMO_ACTOR.email,
}];
const [idea] = fixture.ideas;
fixture.ideas = [1, 2].map((index) => ({
  ...idea, id: `idea-${index}`, title: `Idea ${index}`, state: "approved",
}));
fixture.pipelineBriefs = [1, 2].map((index) => ({
  id: `brief-${index}`, identity: `brief-${index}`, version: 1, externalId: "",
  title: `Pipeline brief ${index}`, angle: `Angle from brief ${index}`,
  channel: "LinkedIn", account: "RyzaLab", format: "Text post", audience: "",
  timezone: "America/New_York", sourceUrls: [], existingCopy: "", notes: "",
  historical: false, sheet: "Calendar", row: index + 1, sourceFile: "Calendar.xlsx",
  importedAt: post.updatedAt, updatedAt: post.updatedAt, importedBy: DEMO_ACTOR.email,
}));
const script=await build({stdin:{contents:`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{NewsletterComposer}from'./components/newsletter-composer';import{NewsletterSources}from'./components/newsletter-sources';import{applyCommand}from'./lib/studio/engine';window.calls=[];function App(){const[state,setState]=useState(${JSON.stringify(fixture)}),[opened,setOpened]=useState(''),[focusRequest,setFocusRequest]=useState('');async function send(c){window.calls.push(c);const next=applyCommand(state,${JSON.stringify(DEMO_ACTOR)},c,{demo:true});setState(next);return{state:next};}return opened?<><p>Newsletter draft opened</p><NewsletterSources content={state.contents.find(c=>c.id===opened)}/></>:<><button onClick={()=>setFocusRequest(crypto.randomUUID())}>Create Brand Newsletter</button><div style={{height:1400}}/><NewsletterComposer focusRequest={focusRequest} state={state} send={send} open={setOpened} disabled={false} demo={true} initialSource="pipeline:brief-1"/></>};createRoot(document.getElementById('app')).render(<App/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ acceptDownloads: true });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("http://localhost:31341/**", route => route.fulfill({
    contentType: "text/html",
    body: '<div id="app"></div><script>' + script.outputFiles[0].text + '</script>',
  }));
  await page.goto("http://localhost:31341/");
  const title = page.getByLabel("Combined newsletter title", { exact: true });
  const shortcut = page.getByRole("button", { name: "Create Brand Newsletter", exact: true });
  await shortcut.click();
  assert.ok(await title.evaluate(input => document.activeElement === input && input.getBoundingClientRect().bottom <= innerHeight));
  await title.fill("Home systems: a combined issue");
  await page.getByText("Combine sources into a newsletter", { exact: true }).click();
  await shortcut.click();
  assert.equal(await title.inputValue(), "Home systems: a combined issue");
  assert.ok(await title.evaluate(input => document.activeElement === input));
  assert.equal(await page.evaluate(() => (window as any).calls.length), 0);
  const create = page.getByRole("button", { name: "Create Brand Newsletter draft" });
  assert.equal(await create.isEnabled(), false);
  assert.equal(await page.getByRole("checkbox", { name: /Pipeline brief 1/ }).isChecked(), true);
  await page.getByRole("checkbox", { name: /Pipeline brief 2/ }).check();
  await page.getByRole("button", { name: /^Ideas / }).click();
  await page.getByRole("checkbox", { name: /Idea 1/ }).check();
  await page.getByRole("checkbox", { name: /Idea 2/ }).check();
  await page.getByRole("button", { name: /^Past posts and drafts/ }).click();
  await page.getByRole("checkbox", { name: /Existing post for combined issue/ }).check();
  await page.getByRole("checkbox", { name: /Published post for combined issue.*Previously published/ }).check();
  await page.getByLabel("Newsletter pasted sources", { exact: true }).fill("A field note.");
  await page.getByLabel("Newsletter source documents", { exact: true }).setInputFiles({
    name: "source.txt", mimeType: "text/plain", buffer: Buffer.from("Exact uploaded reference."),
  });
  await page.getByRole("button", { name: "Remove source.txt", exact: true }).waitFor();
  await create.click();
  await page.getByText("Newsletter draft opened", { exact: true }).waitFor();
  await page.getByText("Combined newsletter outline and 8 source snapshots", { exact: true }).click();
  await page.getByText("source.txt · document", { exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download original source.txt", exact: true }).click();
  const download = await pending;
  assert.equal(await fs.readFile((await download.path())!, "utf8"), "Exact uploaded reference.");
  const calls = await page.evaluate(() => (window as any).calls);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "newsletter.compose");
  assert.deepEqual(calls[0].sources.map((s: { kind: string }) => s.kind),
    ["pipeline", "pipeline", "idea", "idea", "content", "content", "document", "text"]);
  assert.match(calls[0].outline, /Story: Pipeline brief 1/);
  assert.match(calls[0].outline, /Story: Published post for combined issue/);
  assert.deepEqual(errors, []);
  console.log("PASS: mixed selection, minimum source count, generated outline, saved draft and original download");
} finally {
  await browser.close();
}
