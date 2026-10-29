import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
 const page = await browser.newPage();
 await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:3005') + '/preview');
 await page.locator('.s-sidebar nav').getByRole('button',{name:'AI & budgets',exact:true}).click();
 await page.getByRole('button',{name:'Set up text',exact:true}).click();
 let dialog = page.getByRole('dialog',{name:'Set up AI connection'});
 await dialog.getByLabel('Connection name').fill('Editor test');
 await dialog.getByPlaceholder('Or enter exact API model ID').fill('test-model');
 await dialog.getByRole('button',{name:'Save connection',exact:true}).click();
 await dialog.waitFor({state:'hidden'});
 const row = page.locator('.s-connection-row').filter({hasText:'Editor test'});
 await row.getByRole('button',{name:'Edit connection',exact:true}).click();
 dialog = page.getByRole('dialog',{name:'Edit AI connection'});
 await dialog.getByLabel('Connection name').fill('Updated connection');
 await dialog.getByRole('button',{name:'Save connection',exact:true}).click();
 await dialog.waitFor({state:'hidden'});
 assert.equal(await page.locator('.s-connection-row').filter({hasText:'Updated connection'}).count(),1);
 console.log('PASS: create and edit connection in place through new editor');
} finally { await browser.close(); }
