import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const script = await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: "tsx",
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{useDraftSave,DraftSaveStatus}from'./components/draft-save-controller';import{initialState,DEMO_ACTOR}from'./lib/studio/seed';import{applyCommand}from'./lib/studio/engine';import{valuesOf}from'./lib/studio/draft-recovery';import{StudioResponseError}from'./lib/studio/response';let db=initialState(DEMO_ACTOR,true);db.contents=[db.contents[0]];window.mode='ok';window.calls=0;function App(){const[state,setState]=useState(db),[values,setValues]=useState(valuesOf(state.contents[0]));const controller=useDraftSave({content:state.contents[0],actor:DEMO_ACTOR,mode:'demo',values,apply:setValues,onError:message=>window.lastError=message,refresh:async()=>setState(structuredClone(db)),send:async cmd=>{window.calls++;if(window.mode==='conflict'){db=applyCommand(db,DEMO_ACTOR,{...cmd,operationId:crypto.randomUUID(),expectedRevision:db.contents[0].revision,text:'Newer server text'},{demo:true});window.mode='ok';throw new StudioResponseError('Draft changed',409);}if(window.mode==='no-commit')throw Error('Network timeout');db=applyCommand(db,DEMO_ACTOR,cmd,{demo:true});if(window.mode==='lost')throw Error('Acknowledgement lost');if(window.mode==='delay')await new Promise(resolve=>window.release=resolve);setState(structuredClone(db));return{state:structuredClone(db),actor:DEMO_ACTOR,mode:'demo'};}});window.controller=controller;window.server=()=>db;return <><label>Writing<textarea aria-label="Writing" value={values.text} onChange={e=>setValues({...values,text:e.target.value})}/></label><button onClick={()=>controller.save()} disabled={controller.busy||controller.conflict||controller.status==='unknown'}>Save</button><p id="status">{controller.status} / {controller.dirty?'dirty':'clean'}</p><DraftSaveStatus controller={controller}/></>};createRoot(document.getElementById('app')).render(<App/>);`,
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  loader: { ".css": "empty" },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_SUPABASE_URL": '"local"',
  },
});
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);
  page.on("console", (m) => {
    if (m.type() === "error") console.error(m.text());
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error(e.stack);
  });
  await page.route("http://localhost:31347/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body:
        '<div id="app"></div><script>' +
        script.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    }),
  );
  await page.goto("http://localhost:31347/");
  console.log(
    "Initial body:",
    (await page.locator("body").innerText()).slice(0, 200),
  );
  const writing = page.getByLabel("Writing", { exact: true });
  await writing.fill("Unsubmitted local working copy");
  await page.waitForFunction(() =>
    Object.keys(localStorage).some((k) =>
      k.startsWith("ryza-draft-recovery-v1:"),
    ),
  );
  await page.reload();
  await writing.waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector("textarea")?.value ===
      "Unsubmitted local working copy",
  );
  await page.evaluate(() => (window["mode"] = "lost"));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("heading", { name: /Save outcome unknown/ }).waitFor();
  assert.equal(await page.evaluate(() => window["calls"]), 1);
  await page
    .getByRole("button", { name: "Check save status", exact: true })
    .click();
  await page.waitForFunction(
    () => document.getElementById("status")?.textContent === "saved / clean",
  );
  assert.equal(await page.evaluate(() => window["calls"]), 1);
  await writing.fill("Draft at dispatch");
  await page.evaluate(() => (window["mode"] = "delay"));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await writing.fill("Newer local edit while saving");
  await page.evaluate(() => window["release"]());
  await page.waitForFunction(
    () => document.getElementById("status")?.textContent === "saved / dirty",
  );
  assert.equal(await writing.inputValue(), "Newer local edit while saving");
  await page.evaluate(() => (window["mode"] = "conflict"));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("heading", { name: /A newer saved version/ }).waitFor();
  assert.equal(await writing.inputValue(), "Newer local edit while saving");
  await page
    .getByRole("button", { name: "Use this merged version for next save" })
    .click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForFunction(
    () => document.getElementById("status")?.textContent === "saved / clean",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: local reload recovery, lost-ack receipt reconciliation without resubmit, typing during save, conflict preservation and deliberate merge/save",
  );
} finally {
  await browser.close();
}
