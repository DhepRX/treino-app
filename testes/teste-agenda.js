const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { chromium, devices } = require('playwright');

const url = 'http://127.0.0.1:8766/treino-app/';
const LS = 'treino-renan-v1';
const dias = offset => new Date(Date.UTC(2026, 10, 16 + offset, 12));
const treino = (id, wid, offset, sets) => ({
  id, wid, ficha:2, start:+dias(offset), end:+dias(offset) + 3600000, sets
});
const feita = kg => [{ kg, reps:12, done:true }];

(async () => {
  const browser = await chromium.launch();
  try {
    const opcoes = { ...devices['iPhone 13'], serviceWorkers:'block', timezoneId:'America/Sao_Paulo', acceptDownloads:true };
    const ctx = await browser.newContext(opcoes);
    const pagina = await ctx.newPage();
    const erros = [];
    pagina.on('pageerror', e => erros.push(e.message));
    await pagina.clock.setFixedTime(dias(0));
    await pagina.goto(url);
    const anterior = {
      v:1, cur:null, upd:+dias(-7),
      hist:[treino('anterior', 'B', -7, { c1:feita(75), a5:feita(8), b6:feita(10) })]
    };
    await pagina.evaluate(({key,dados}) => localStorage.setItem(key, JSON.stringify(dados)), {key:LS,dados:anterior});
    await pagina.reload();
    assert.match(await pagina.textContent('#today'), /Hoje na agenda: Treino A/);
    const slots = '#agendaInicio .agenda-dia';
    assert.deepEqual(await pagina.locator(slots + ' strong').allTextContents(), ['A','B','–','C','D','–','–']);
    assert.equal(await pagina.textContent('#agendaInicio [data-agenda-contagem]'), '0 de 4 treinos feitos');

    await pagina.click('#agendaInicio [data-editar-agenda]');
    await pagina.selectOption('[data-agenda-troca="B"]','2');
    const dados = () => pagina.evaluate(key => JSON.parse(localStorage.getItem(key)), LS);
    assert.deepEqual((await dados()).agendaTreino['2026-11-16'], { A:0, B:2, C:3, D:4 });
    await pagina.selectOption('[data-agenda-troca="C"]','4');
    assert.deepEqual((await dados()).agendaTreino['2026-11-16'], { A:0, B:2, C:4, D:3 });
    await pagina.selectOption('[data-agenda-troca="D"]','4');
    await pagina.reload();
    assert.deepEqual(await pagina.locator(slots + ' strong').allTextContents(), ['A','–','B','C','D','–','–']);

    await pagina.click('#agendaInicio [data-open="B"]');
    assert.equal(await pagina.locator('#ex-a5, #ex-b6').count(), 0);
    assert.equal(await pagina.inputValue('#ex-c1 [data-i="0"] [data-f="kg"]'), '75');
    assert.equal(await pagina.locator('[data-act="start"]').isEnabled(), true, 'Agenda permite treinar fora do dia planejado');
    await pagina.click('[data-tab="D"]');
    assert.equal(await pagina.locator('#ex-a5, #ex-a7').count(), 0);
    assert.equal(await pagina.locator('#ex-d6').count(), 1);
    await pagina.click('[data-tab="A"]');
    await pagina.click('#ex-a1 [data-i="0"] [data-done]');
    await pagina.click('.finish [data-act="finish"]');
    await pagina.click('.finish [data-act="finish"]');
    assert.equal((await dados()).hist.at(-1).ficha, 3);
    assert.equal(await pagina.textContent('#agendaInicio [data-agenda-contagem]'), '1 de 4 treinos feitos');
    assert.match(await pagina.getAttribute('#agendaInicio [data-open="A"]','aria-label'), /feito segunda/);
    assert.deepEqual((await dados()).hist[0], anterior.hist[0]);

    const [backup] = await Promise.all([pagina.waitForEvent('download'), pagina.click('#bkSave')]);
    const arquivo = await readFile(await backup.path());
    const novo = await (await browser.newContext(opcoes)).newPage();
    await novo.clock.setFixedTime(dias(2));
    await novo.goto(url);
    await novo.setInputFiles('#bkFile', { name:'semana.json', mimeType:'application/json', buffer:arquivo });
    await novo.waitForFunction(() => document.querySelector('#bkMsg').textContent.includes('Agenda restaurada'));
    assert.match(await novo.textContent('#today'), /Hoje na agenda: Treino B/);
    await novo.clock.setFixedTime(dias(7));
    await novo.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    assert.deepEqual(await novo.locator(slots + ' strong').allTextContents(), ['A','B','–','C','D','–','–']);
    assert.equal(await novo.textContent('#agendaInicio [data-agenda-contagem]'), '0 de 4 treinos feitos');
    assert.equal(await novo.evaluate(() => document.documentElement.scrollWidth), 390);

    // Um B já aberto na ficha 2 conserva os exercícios retirados da ficha 3.
    await novo.evaluate(key => {
      const d = JSON.parse(localStorage.getItem(key));
      d.cur = { wid:'B', ficha:2, start:Date.now() - 1000, sets:{}, warm:{} };
      localStorage.setItem(key, JSON.stringify(d));
    }, LS);
    await novo.reload();
    assert.equal(await novo.locator('#ex-a5, #ex-b6').count(), 2);
    assert.deepEqual(erros, []);
    console.log('Agenda: semana padrão, troca, treino livre, conclusão, backup, virada de semana e ficha antiga preservada.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
