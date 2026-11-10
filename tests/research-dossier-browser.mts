import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {dossierState,dossierResponse,now} from './fixtures/research-dossier';
import {applyWorkerReceipt,LEASE_EXPIRED_ERROR} from '../lib/studio/worker-receipt';
import type {StudioState} from '../lib/studio/types';
import {DEMO_ACTOR} from '../lib/studio/seed';
const initial=dossierState(),sourceId=initial.jobs[0].id;
const script=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{ResearchPanel}from'./components/research-panel';import{applyCommand}from'./lib/studio/engine';import{researchAnalysisInput}from'./lib/studio/research-analysis';import{quote}from'./lib/studio/pricing';
const actor=${JSON.stringify(DEMO_ACTOR)},sourceId=${JSON.stringify(sourceId)};window.commands=[];window.recover=false;
function App(){const[state,setState]=useState(${JSON.stringify(initial)});window.savedState=state;
async function run(c){window.commands.push(c);if(c.type!=='research.analyze')throw Error('Unexpected command');const input=researchAnalysisInput(state,actor,c),priced=quote(state,input);const next=applyCommand(state,actor,input,{researchAnalysis:true,quotedCost:priced.cost,pricingSnapshot:priced.pricingSnapshot});next.jobs[0].state='unknown';next.jobs[0].error=${JSON.stringify(LEASE_EXPIRED_ERROR)};next.jobs[0].leaseId='browser-lease';setState(next);return true;}
async function refresh(){if(window.recover)setState(await window.recoverSavedReceipt(state));}
return <ResearchPanel state={state} actor={actor} channel='LinkedIn' selected={[]} onSelected={()=>{}} run={run} refresh={refresh} demo={false}/>;}createRoot(document.getElementById('app')).render(<App/>);`},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:1000},acceptDownloads:true}),errors:string[]=[],requests:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:31359/**',r=>{if(r.request().url().includes('/api/')){requests.push(r.request().url());assert.match(r.request().url(),/\/jobs\/progress$/);return r.fulfill({contentType:'application/json',body:JSON.stringify({status:'unknown'})});}return r.fulfill({contentType:'text/html',body:'<div id="app"></div><script>'+script.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>'});});
 await page.exposeFunction('recoverSavedReceipt',(state:StudioState)=>applyWorkerReceipt(state,{version:1,jobId:state.jobs[0].id,leaseId:'browser-lease',receivedAt:now,outcome:{text:JSON.stringify(dossierResponse()),completion:'complete'}}));
 await page.goto('http://localhost:31359/');
 const analyze=page.getByRole('button',{name:'Analyze sources and build dossier'});await analyze.waitFor();assert.equal(await analyze.isEnabled(),false);
 await page.getByLabel(/Authorize one analysis up to/).check();await analyze.click();await page.getByText(/Outcome is uncertain/).waitFor();assert.equal(await analyze.count(),0);
 await page.getByRole('button',{name:'Check analysis status — no new request'}).click();assert.equal(await page.evaluate(()=>(window as any).commands.length),1);
 await page.evaluate(()=>{(window as any).recover=true;});await page.getByRole('button',{name:'Check analysis status — no new request'}).click();await page.getByText(/Dossier ready/).waitFor();
 await page.getByText('Research dossier · 1 claims · 1 calculations',{exact:true}).click();await page.getByRole('heading',{name:'Claim ledger',exact:true}).waitFor();await page.getByText('c1 · supported',{exact:true}).waitFor();await page.getByText('Change in recorded installations: 20 %',{exact:true}).waitFor();await page.getByText('(120 - 100) / 100 × 100',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'s1 · Installation study'}).first().getAttribute('href'),'https://evidence.example.org/study');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download dossier and calculation inputs'}).click();const download=await downloadPromise;await download.saveAs('/tmp/ryzalab-dossier-browser.json');const data=JSON.parse(await fs.readFile('/tmp/ryzalab-dossier-browser.json','utf8'));assert.equal(data.calculationResults[0].value,20);assert.equal(data.data[0].literal,'100');assert.equal(await page.evaluate(()=>(window as any).commands.length),1);assert.equal(requests.length,2);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/ryzalab-dossier-mobile.png',fullPage:true});
 console.log('PASS: explicit analysis allowance, uncertain outcome without duplicate requests, saved receipt recovery, ledger/source inspection, reproducible calculation and JSON export; no provider calls.');
}finally{await browser.close();}
