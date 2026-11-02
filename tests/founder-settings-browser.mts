import type { StudioState } from "../lib/studio/types";
declare global {
  interface Window {
    commands: unknown[];
    getState: () => StudioState;
  }
}
import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
const fixture = initialState(DEMO_ACTOR, true);
fixture.members[0].roles = ["administrator"];
fixture.settings.monthlyCap = 0;
fixture.settings.requestCap = 0;
const contents = `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{FounderSetup}from'./components/founder-setup';import{SoloPolicySettings}from'./components/solo-policy-settings';import{claimFounder,founderSetupStatus}from'./lib/studio/founder-setup';import{applyCommand}from'./lib/studio/engine';
const actor=${JSON.stringify(DEMO_ACTOR)};let state=${JSON.stringify(fixture)};let serial=0;window.commands=[];window.getState=()=>state;
function App(){const[current,setCurrent]=useState(state);async function changed(){setCurrent(state);}
async function request(body){if(!body)return{...founderSetupStatus(state,actor,actor.email),version:state.version};window.commands.push('claim');state=claimFounder(state,actor,body,actor.email,new Date().toISOString(),'claim');return{};}
async function send(command){window.commands.push(command);state=applyCommand(state,actor,command,{demo:true,id:()=>String(++serial),now:new Date().toISOString()});setCurrent(state);return{};}
return <>{current.members[0].roles.includes('founder')?<SoloPolicySettings state={current} actor={actor} send={send} ready/>:<FounderSetup request={request} changed={changed} demo={false}/>}<button onClick={()=>{state=applyCommand(state,actor,{type:'policy.adoptSolo',expectedPolicyVersion:state.settings.reviewPolicy?.version,expectedRuleVersion:state.settings.protectedVersion,packageCap:40,monthlyCap:400,requireIndependentReview:false,autoDraft:false,autoReview:true},{demo:true,id:()=>String(++serial)});setCurrent(state);}}>Concurrent policy change</button></>;}
createRoot(document.getElementById('app')).render(<App/>);`;
const result = await build({
  stdin: { contents, resolveDir: process.cwd(), loader: "tsx" },
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
  await page.route("http://founder-test.invalid/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<div id="app"></div><script>' +
        result.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    }),
  );
  await page.goto("http://founder-test.invalid/");
  assert.equal(await page.evaluate(() => window.commands.length), 0);
  await page
    .getByRole("button", { name: "Check founder setup", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Confirm founder role", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirm founder role", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Set up two-step review", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(() => window.getState().settings.monthlyCap),
    0,
  );
  await page
    .getByRole("button", { name: "Set up two-step review", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Maximum per package ($)").inputValue(),
    "0.50",
  );
  assert.equal(await page.getByLabel("Monthly limit ($)").inputValue(), "");
  await page.getByLabel("Monthly limit ($)").fill("5.00");
  await page
    .getByRole("button", { name: "Save review settings", exact: true })
    .click();
  await page.getByText(/Two-step review enabled/).waitFor();
  assert.equal(
    await page.evaluate(() => window.getState().settings.monthlyCap),
    500,
  );
  assert.equal(
    await page.evaluate(
      () => window.getState().settings.reviewPolicy.autoDraft,
    ),
    true,
  );
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Concurrent policy change", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save review settings", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: /changed/ })
    .waitFor();
  assert.equal(
    await page.evaluate(() => window.getState().settings.monthlyCap),
    400,
  );
  console.log(
    "PASS: explicit founder claim, separate policy adoption, default caps and stale-form protection; isolated fixture only",
  );
} finally {
  await browser.close();
}
