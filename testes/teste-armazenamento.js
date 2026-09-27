const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers:'block', timezoneId:'America/Sao_Paulo', acceptDownloads:true });
    await ctx.addInitScript(() => {
      window.bloquearGravacao = true;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'treino-renan-v1' && window.bloquearGravacao) throw new DOMException('Sem espaço', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    const p = await ctx.newPage(), erros = [];
    p.on('pageerror', e => erros.push(e.message));
    await p.goto('http://127.0.0.1:8766/treino-app/');
    assert.equal(await p.locator('#saveWarning').isVisible(), true, 'Falha na primeira gravação deve aparecer');
    await p.click('[data-tab="D"]');
    await p.click('.setrow[data-ex="d1"][data-i="0"] [data-done]');
    assert.match(await p.textContent('#sync'), /Não foi possível salvar/);
    assert.equal(await p.evaluate(() => localStorage.getItem('treino-renan-v1')), null);
    const [download] = await Promise.all([p.waitForEvent('download'), p.click('#saveRescue')]);
    const backup = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    assert.equal(backup.cur.sets.d1[0].done, true, 'Exportação deve resgatar dados em memória');
    assert.equal(await p.locator('#saveWarning').isVisible(), true, 'Exportar não significa salvar localmente');
    await p.evaluate(() => { window.bloquearGravacao = false; });
    await p.click('.setrow[data-ex="d1"][data-i="1"] [data-done]');
    assert.equal(await p.locator('#saveWarning').isVisible(), false);
    const salvo = await p.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')));
    assert.equal(salvo.cur.sets.d1[0].done, true);
    assert.equal(salvo.cur.sets.d1[1].done, true);
    await p.evaluate(() => { window.bloquearGravacao = true; });
    await p.click('.setrow[data-ex="d1"][data-i="1"] [data-done]');
    assert.equal(await p.locator('#saveWarning').isVisible(), true, 'Falha depois de gravação bem-sucedida deve aparecer');
    await p.reload();
    assert.equal(await p.locator('#saveWarning').isVisible(), false);
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')).cur.sets.d1[1].done), true);
    assert.deepEqual(erros, []);
    console.log('OK: falha inicial e posterior, exportação de resgate, recuperação da gravação e persistência.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
