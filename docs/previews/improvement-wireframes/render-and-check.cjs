// Design-only browser checks and screen-deck renderer. No application APIs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const root = __dirname;
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});
  const errors=[], requests=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.route('**/*', route=> {
    requests.push(route.request().url());
    return route.request().url()==='http://wireframe.local/' ? route.fulfill({contentType:'text/html',body:html}) : route.abort();
  });
  await page.goto('http://wireframe.local/');
  const go = id=>page.evaluate(id=>window.prototype.go(id),id);
  const click = action=>page.locator(`[data-action="${action}"]`).first().click();
  await go('import'); await click('sample-workbook');
  assert.equal(await page.evaluate(()=>prototype.state.screen),'mapping');
  await go('import-review'); await click('confirm-import');
  assert.equal(await page.evaluate(()=>prototype.state.imported),true);
  await click('select-offline'); await click('pipeline-write');
  await click('image-post'); await click('sample-image'); await click('attach-image');
  assert.equal(await page.evaluate(()=>prototype.state.images.post),true);
  await go('newsletter-sources'); await click('add-text');
  await page.locator('#pastedText').fill('Sample construction notes for a combined newsletter.');
  await click('save-text'); await click('newsletter-write');
  assert.equal(await page.evaluate(()=>prototype.state.kind),'newsletter');
  await go('review'); await click('approve');
  assert.equal(await page.evaluate(()=>prototype.state.approved),true);
  await click('change-after-approval');
  assert.notEqual(await page.evaluate(()=>prototype.state.approvedVersion),await page.evaluate(()=>prototype.state.version));
  await go('linkedin'); await click('prepare-only'); await click('approve');
  assert.equal(await page.evaluate(()=>prototype.state.mode),'prepare');
  await page.reload();
  const screens=await page.evaluate(()=>prototype.screens);
  fs.mkdirSync(path.join(root,'screens'),{recursive:true});
  const captures=[];
  for (const [i,item] of screens.entries()) {
    const id=Array.isArray(item)?item[0]:(item.id||item);
    await go(id);
    const title=await page.locator('#main h1').innerText();
    assert.ok(title);
    const filename=`${String(i+1).padStart(2,'0')}-${id}.png`;
    await page.screenshot({path:path.join(root,'screens',filename),fullPage:true});
    captures.push({id,title,filename});
  }
  await page.setViewportSize({width:390,height:844});
  for (const id of ['home','ideas','newsletter-sources','review']) {
    await go(id);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`Mobile overflow: ${id}`);
  }
  assert.deepEqual(errors,[]);
  assert.ok(requests.every(x=>x==='http://wireframe.local/'),'Unexpected network request');
  const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const img=c=>'data:image/png;base64,'+fs.readFileSync(path.join(root,'screens',c.filename)).toString('base64');
  const deck=`<!doctype html><meta charset="utf-8"><style>@page{size:A4 landscape;margin:9mm}body{font:12px Arial;color:#163d40}section{height:186mm;break-after:page;display:flex;flex-direction:column}h1{font-size:23px;margin:0 0 4px}p{margin:0 0 8px}.screen{min-height:0;flex:1;display:flex;justify-content:center}.screen img{max-height:100%;max-width:100%;object-fit:contain;object-position:top}footer{padding-top:5px;font-size:9px}</style>`+captures.map((c,i)=>`<section><h1>${i+1}. ${escape(c.title)}</h1><p>RyzaLab Content Studio · Proposed user experience · ${escape(c.id)}</p><div class="screen"><img src="${img(c)}"></div><footer>WIREFRAME / SAMPLE DATA ONLY · No live integrations or publishing · Open index.html to navigate interactively.</footer></section>`).join('');
  await page.setContent(deck);
  await page.pdf({path:path.join(root,'RyzaLab-Wireframes.pdf'),printBackground:true,preferCSSPageSize:true});
  const selected=['home','ideas','create','newsletter-sources','newsletter','review'];
  const gallery=`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:28px;background:#eaf2f1;color:#173d40;font:16px Arial}h1{margin:0 0 8px}p{margin:0 0 22px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{background:white;padding:12px;border:1px solid #b8ccca;border-radius:10px}h2{font-size:17px;margin:0 0 10px}.frame{height:410px;overflow:hidden}img{width:100%;display:block}</style><h1>RyzaLab Content Studio — proposed layouts</h1><p>Clickable prototype includes 22 screens · Sample data only · Review before implementation</p><div class="grid">`+selected.map(id=>{const c=captures.find(x=>x.id===id);return `<div class="card"><h2>${escape(c.title)}</h2><div class="frame"><img src="${img(c)}"></div></div>`}).join('')+'</div>';
  await page.setViewportSize({width:1600,height:1100});
  await page.setContent(gallery);
  await page.screenshot({path:path.join(root,'layout-overview.png'),fullPage:true});
  console.log(JSON.stringify({screens:captures.length,journeyChecks:'passed',mobile:'passed',pageErrors:errors,externalRequests:requests.filter(x=>x!=='http://wireframe.local/').length,pdf:'RyzaLab-Wireframes.pdf'}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
