import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1200},acceptDownloads:true});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_BASE_URL||'http://localhost:3005');await page.getByRole('heading',{name:'A good week starts here.'}).waitFor();
 await page.screenshot({path:'/tmp/ryzalab-dashboard.png',fullPage:true});
 await page.getByRole('button',{name:/Open weekly brief/}).click();await page.getByLabel('Campaign name').fill('What Stays Home — test');await page.getByRole('button',{name:'Save brief',exact:true}).click();
 await page.reload();await page.getByRole('heading',{name:'What Stays Home — test'}).waitFor();
 await page.locator('.draft-card').filter({hasText:'The questions to ask'}).click();
 await page.getByRole('textbox',{name:'Content editor'}).fill('RyzaLab Blueprint is $395. Local where supported.');await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await page.getByRole('button',{name:'Carousel',exact:true}).click();await page.getByLabel('Slide headline').fill('Better questions.');
 const pdfWait=page.waitForEvent('download');await page.getByRole('button',{name:'PDF',exact:true}).click();const pdf=await pdfWait;await pdf.saveAs('/tmp/ryzalab-carousel.pdf');assert.ok(fs.statSync('/tmp/ryzalab-carousel.pdf').size>10000);
 const pngWait=page.waitForEvent('download');await page.getByRole('button',{name:'PNG ZIP',exact:true}).click();await (await pngWait).saveAs('/tmp/ryzalab-carousel.zip');assert.ok(fs.statSync('/tmp/ryzalab-carousel.zip').size>10000);
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Content',exact:true}).click();await page.getByRole('textbox',{name:'Content editor'}).fill('Nothing ever leaves your home.');await page.getByRole('heading',{name:'Claims need attention.'}).waitFor();
 await page.getByRole('button',{name:'Send to Ryan',exact:true}).click();await page.getByRole('status').filter({hasText:'Resolve blocking'}).waitFor();
 await page.screenshot({path:'/tmp/ryzalab-editor.png',fullPage:true});
 await page.getByRole('button',{name:/Drafts/}).first().click();await page.getByLabel('Search drafts').fill('The questions');assert.equal(await page.locator('.table-row').count(),1);await page.locator('.table-row').click();assert.equal(await page.getByRole('textbox',{name:'Content editor'}).inputValue(),'RyzaLab Blueprint is $395. Local where supported.');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open menu'}).click();await page.getByRole('button',{name:'Home',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);await page.getByRole('button',{name:'Dismiss notification'}).click();await page.screenshot({path:'/tmp/ryzalab-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile page overflows');
 for(const endpoint of ['generate','images','invite','review']){const response=await page.request.post(`${process.env.TEST_BASE_URL||'http://localhost:3005'}/api/${endpoint}`,{data:{}});assert.ok([401,503].includes(response.status()),`${endpoint} must reject unauthenticated calls`)}
 assert.deepEqual(errors,[]);console.log('PASS: dashboard, brief persistence, draft edit/save/reopen, live brand checks, review gate, PDF/PNG exports, search, and mobile navigation. No browser errors.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
