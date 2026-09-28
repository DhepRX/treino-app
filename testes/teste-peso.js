const assert = require('node:assert/strict');
// Peso digitado uma vez só: a série 1 preenche as seguintes.
require('fs').mkdirSync(__dirname + '/prints', { recursive: true });
const { chromium, devices } = require('playwright');
const URL_APP = 'http://127.0.0.1:8766/treino-app/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', timezoneId: 'America/Sao_Paulo' });
  const p = await ctx.newPage();
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL_APP); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('treino-renan-v1')); ['A','B','C','D'].forEach((w, i) => s.hist.push({ id:'f2' + w, wid:w, ficha:2, manual:true, start:Date.UTC(2026,8,20+i,12), end:Date.UTC(2026,8,20+i,12), sets:{} })); s.hist.sort((a,b)=>a.start-b.start); localStorage.setItem('treino-renan-v1', JSON.stringify(s)); }); await p.reload(); // ciclo da ficha 2 já feito: séries da tabela
  const kg = (ex, i) => p.inputValue(`.setrow[data-ex="${ex}"][data-i="${i}"] [data-f="kg"]`);
  const reps = (ex, i) => p.inputValue(`.setrow[data-ex="${ex}"][data-i="${i}"] [data-f="reps"]`);
  const campo = (ex, i, f) => `.setrow[data-ex="${ex}"][data-i="${i}"] [data-f="${f}"]`;
  const salvo = (ex) => p.evaluate(ex => JSON.parse(localStorage.getItem('treino-renan-v1')).cur?.sets?.[ex], ex);

  // 1. Treino D, sem treino começado: digita 55 na série 1 do supino (sem carga sugerida).
  await p.click('[data-tab="C"]');
  await p.click(campo('d1', 0, 'kg'));
  await p.keyboard.type('55');
  console.log('D supino, digitou 55 na série 1 ->', await kg('d1', 0), await kg('d1', 1), await kg('d1', 2), '| treino começou:', await p.isVisible('#dock'));

  // 2. Marca série 1 com 10 reps; marca a 2 sem digitar nada.
  await p.fill(campo('d1', 0, 'reps'), '10');
  await p.click(`.setrow[data-ex="d1"][data-i="0"] [data-done]`);
  await p.click(`.setrow[data-ex="d1"][data-i="1"] [data-done]`);
  const s2 = (await salvo('d1'))[1];
  console.log('série 2 marcada sem digitar ->', s2.kg, 'kg x', s2.reps, 'reps | linha:', (await p.textContent('.setrow[data-ex="d1"][data-i="1"] .setmini span')));
  assert.equal(s2.kg, 55); assert.equal(s2.reps, 10); assert.equal(s2.done, true);
  console.log('salvo:', JSON.stringify(await salvo('d1')));

  // 3. Troca a série 3 na mão (drop) e depois muda a série 1: a 3 não pode mudar.
  await p.click(campo('d1', 2, 'kg')); await p.keyboard.press('Control+A'); await p.keyboard.type('50');
  await p.click('.setrow[data-ex="d1"][data-i="0"] [data-editar-serie]');
  await p.keyboard.press('Control+A'); await p.keyboard.type('57,5');
  const ss = await salvo('d1');
  assert.equal(ss[0].kg, 57.5); assert.equal(ss[1].kg, 55); assert.equal(await kg('d1', 2), '50');
  console.log('série 3 trocada na mão para 50, depois série 1 (editar) -> 57,5:', ss[0].kg, ss[1].kg, await kg('d1', 2), '(2 já marcada fica 55, 3 fica 50)');

  // 4. Exercício com carga sugerida (puxada, sem carga) e mudança dígito a dígito.
  await p.click(campo('d2', 0, 'kg')); await p.keyboard.type('4'); await p.keyboard.type('5');
  console.log('puxada digitando 4 e depois 5 ->', await kg('d2', 0), await kg('d2', 1), await kg('d2', 2));

  // 5. Treino A (supino reto tem sugestão de 26 kg nas 3 séries): trocar a 1 muda todas.
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('treino-renan-v1')); ['A','B','C','D'].forEach((w, i) => s.hist.push({ id:'f2' + w, wid:w, ficha:2, manual:true, start:Date.UTC(2026,8,20+i,12), end:Date.UTC(2026,8,20+i,12), sets:{} })); s.hist.sort((a,b)=>a.start-b.start); localStorage.setItem('treino-renan-v1', JSON.stringify(s)); }); await p.reload(); // ciclo da ficha 2 já feito: séries da tabela
  await p.click('[data-tab="A"]');
  console.log('A supino antes:', await kg('a1', 0), await kg('a1', 1), await kg('a1', 2));
  await p.click(campo('a1', 0, 'kg')); await p.keyboard.press('Control+A'); await p.keyboard.type('28');
  console.log('A supino, série 1 -> 28:', await kg('a1', 0), await kg('a1', 1), await kg('a1', 2), '| foco continua no campo:', await p.evaluate(() => document.activeElement.dataset.f));

  // 6. Recarregar mantém os pesos.
  await p.waitForTimeout(200); await p.reload(); await p.click('[data-tab="A"]');
  assert.deepEqual(await Promise.all([0,1,2].map(i=>kg('a1',i))), ['28','28','28']);
  console.log('depois de recarregar:', await kg('a1', 0), await kg('a1', 1), await kg('a1', 2));

  assert.deepEqual(erros, [], 'Não deve haver erros de JavaScript inesperados');
  console.log('erros: nenhum');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
