const assert = require('node:assert/strict');
// Sinal fraco: o servidor segura a página por 15 s; o app tem que abrir pela cópia guardada em ~3 s.
require('fs').mkdirSync(__dirname + '/prints', { recursive: true });
const { chromium, devices } = require('playwright');
const BASE = 'http://127.0.0.1:8766', URL_APP = BASE + '/treino-app/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'allow', timezoneId: 'America/Sao_Paulo' });
  const page = await ctx.newPage();
  await page.goto(URL_APP); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload();
  assert.equal(await page.evaluate(()=>!!navigator.serviceWorker.controller),true);
  console.log('SW controlando:', await page.evaluate(() => !!navigator.serviceWorker.controller));
  await fetch(BASE + '/__lento');
  let t0 = Date.now();
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert.ok(Date.now()-t0 < 7000, 'Cache deve abrir antes dos 15 segundos da rede'); assert.equal(await page.title(),'Treino');
  console.log('sinal fraco (servidor demora 15 s): abriu em', ((Date.now() - t0) / 1000).toFixed(1), 's | conteúdo:', await page.textContent('#today'));
  await fetch(BASE + '/__normal');
  await page.waitForTimeout(13000);
  t0 = Date.now();
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded' });
  console.log('sinal bom: abriu em', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
