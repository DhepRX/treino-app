const assert = require('node:assert/strict');
// Teste geral: cache offline, sinal fraco, lembrete de backup, virada do dia e o fluxo do treino.
require('fs').mkdirSync(__dirname + '/prints', { recursive: true });
const { chromium, devices } = require('playwright');
const BASE = 'http://127.0.0.1:8766';
const URL_APP = BASE + '/treino-app/';
const OUT = __dirname + '/prints';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'allow', acceptDownloads: true, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR', ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push('pageerror: ' + e.message));
  page.on('console', m => {
    const origem = new URL(m.location().url || 'about:blank').origin;
    const fonte = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(origem);
    if (m.type() === 'error' && fonte && /net::ERR_/.test(m.text())) { console.log('Fonte indisponível:', m.location().url); return; }
    if (m.type() === 'error') erros.push('console: ' + m.text() + ' ' + JSON.stringify(m.location().url));
  });

  await page.goto(URL_APP, { waitUntil: 'load' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'load' });
  console.log('SW controlando:', await page.evaluate(() => !!navigator.serviceWorker.controller));
  console.log('caches:', await page.evaluate(async () => {
    const out = {};
    for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).length + ' itens';
    return out;
  }));
  console.log('hoje:', await page.textContent('#today'));

  // Lembrete de backup.
  const bkInfo = async () => (await page.textContent('#bkLast')) + ' | destacado=' + await page.evaluate(() => document.getElementById('backup').classList.contains('due'));
  console.log('backup antes:', await bkInfo());
  await page.locator('#backup').scrollIntoViewIfNeeded();
  await page.screenshot({ path: OUT + '/backup-antes.png' });
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.click('#bkSave')]);
  assert.ok(dl, 'Backup deve gerar download');
  console.log('download:', dl && dl.suggestedFilename());
  console.log('backup depois:', await bkInfo());

  // Fluxo do treino com o som liberado no toque.
  await page.click('[data-view="treino"]');
  await page.click('[data-tab="A"]');
  await page.click('.setrow[data-ex="a1"][data-i="0"] [data-done]');
  await page.waitForTimeout(300);
  console.log('dock:', (await page.textContent('#dock')).replace(/\s+/g, ' ').trim(), '| audio:', await page.evaluate(() => typeof AudioContext));
  await page.click('#dockBtns [data-rest="skip"]');
  await page.waitForTimeout(400);
  console.log('dock após pular:', (await page.textContent('#dock')).replace(/\s+/g, ' ').trim());
  // Cronômetro da prancha (Treino D) não deve funcionar com outro treino em andamento.
  await page.click('[data-act="finish"]');
  await page.click('[data-act="finish"]');
  console.log('resumo:', await page.textContent('.summary h3'));
  console.log('backup após treino (hoje, sem atraso):', await bkInfo());

  // Antes do sinal fraco: o pedido lento de 15 s seguraria o próximo pedido ao mesmo endereço.
  // Site que mudou de endereço (redirecionamento): o app segue para o endereço novo, em vez de ficar na cópia guardada.
  await fetch(BASE + '/__mudou');
  await page.goto(URL_APP, { waitUntil: 'load' });
  assert.equal(new URL(page.url()).pathname, '/treino-app/README.md', 'Redirecionamento tem que chegar ao navegador');
  console.log('redirecionamento: foi para', new URL(page.url()).pathname);
  await fetch(BASE + '/__normal');

  // Sinal fraco: a página demora 15 s na internet, o app tem que abrir pela cópia em ~3 s.
  await fetch(BASE + '/__lento');
  let t0 = Date.now();
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded', timeout: 20000 });
  assert.ok(Date.now()-t0 < 7000, 'Cache deve evitar a espera de 15 segundos');
  console.log('sinal fraco: abriu em', ((Date.now() - t0) / 1000).toFixed(1), 's | título:', await page.title());
  await fetch(BASE + '/__normal');

  // Outra página publicada na pasta (o README) não pode virar a cópia guardada do app.
  await page.goto(URL_APP + 'README.md', { waitUntil: 'load' });
  await fetch(BASE + '/__lento');
  t0 = Date.now();
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded', timeout: 20000 });
  assert.equal(await page.title(), 'Treino', 'Abrir o README não pode trocar a cópia guardada do app');
  assert.ok(Date.now() - t0 < 7000);
  console.log('depois de abrir o README, com sinal fraco: abriu o app em', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await fetch(BASE + '/__normal');

  // Sem internet.
  await ctx.setOffline(true);
  t0 = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.title(),'Treino'); assert.ok(await page.locator('#today').isVisible());
  console.log('offline: abriu em', ((Date.now() - t0) / 1000).toFixed(1), 's | hoje:', await page.textContent('#today'));
  await ctx.setOffline(false);

  // Virada do dia: fixa o relógio hoje, depois pula para amanhã e volta para o app.
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => erros.push('p2 pageerror: ' + e.message));
  await p2.clock.setFixedTime(new Date('2026-09-26T10:00:00-03:00'));
  await p2.goto(URL_APP, { waitUntil: 'load' });
  await p2.click('[data-view="cal"]');
  const hojeCal = () => p2.evaluate(() => { const b = document.querySelector('.cd.today'); return b ? b.dataset.cd : null; });
  console.log('antes: hoje no calendário =', await hojeCal(), '| selecionado =', await p2.evaluate(() => document.querySelector('.cd.sel') && document.querySelector('.cd.sel').dataset.cd));
  await p2.clock.setFixedTime(new Date('2026-09-28T08:00:00-03:00'));
  await p2.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await p2.waitForTimeout(200);
  assert.equal(await hojeCal(), '2026-09-28');
  console.log('depois: hoje no calendário =', await hojeCal(), '| selecionado =', await p2.evaluate(() => document.querySelector('.cd.sel') && document.querySelector('.cd.sel').dataset.cd), '| header:', await p2.textContent('#today'));

  // iPhone no modo escuro: o app continua claro.
  const p3 = await browser.newPage({ ...devices['iPhone 13'], colorScheme: 'dark', timezoneId: 'America/Sao_Paulo' });
  await p3.goto(URL_APP, { waitUntil: 'load' });
  assert.equal(await p3.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(242, 242, 242)');
  await p3.locator('#backup').scrollIntoViewIfNeeded();
  await p3.screenshot({ path: OUT + '/backup-iphone-escuro.png' });

  assert.deepEqual(erros, [], 'Não deve haver erros de JavaScript inesperados');
  console.log('erros: nenhum');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
