const assert = require('node:assert/strict');
// Cards que minimizam quando o exercício termina.
require('fs').mkdirSync(__dirname + '/prints', { recursive: true });
const { chromium, devices } = require('playwright');
const { paraOntem } = require('./ajuda');
const URL_APP = 'http://127.0.0.1:8766/treino-app/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', colorScheme: 'dark', timezoneId: 'America/Sao_Paulo' });
  const p = await ctx.newPage();
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL_APP); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('treino-renan-v1')); ['A','B','C','D'].forEach((w, i) => s.hist.push({ id:'f2' + w, wid:w, ficha:2, manual:true, start:Date.UTC(2026,8,20+i,12), end:Date.UTC(2026,8,20+i,12), sets:{} })); s.hist.sort((a,b)=>a.start-b.start); localStorage.setItem('treino-renan-v1', JSON.stringify(s)); }); await p.reload(); // ciclo da ficha 2 já feito: séries da tabela
  const mini = id => p.evaluate(id => { const c = document.getElementById('ex-' + id); return c ? c.classList.contains('mini') : null; }, id);
  const ordem = () => p.locator('#workout .exlist > .ex').evaluateAll(cs => cs.map(c => c.id.slice(3)));
  const marcar = (id, i) => p.click(`.setrow[data-ex="${id}"][data-i="${i}"] [data-done]`);

  await p.click('[data-tab="C"]');
  // O cardio termina sem marcar séries do exercício.
  assert.equal(await p.locator('.card.warm [data-warm]').count(), 1);
  await p.click('[data-warm="0"]');
  await p.waitForTimeout(900);
  assert.equal(await p.locator('.card.warm.mini').count(), 1);
  assert.equal(await p.textContent('.card.warm .mt small'), 'Feito');
  assert.match(await p.textContent('#progresso'), /0 de \d+ séries feitas/);
  assert.equal(await p.locator('#ex-d1 .sets [data-aquec-linha]').count(), 2);
  assert.equal(await p.locator('#ex-d2 [data-aquec-linha]').count(), 0);
  await p.reload();
  assert.equal(await p.locator('.card.warm.mini').count(), 1, 'Cardio continua concluído ao recarregar');
  console.log('cardio minimizado:', await p.evaluate(() => document.querySelector('.card.warm').classList.contains('mini')));

  // Supino: peso 22 na série 1, marca as 3.
  await p.click('.setrow[data-ex="d1"][data-i="0"] [data-f="kg"]'); await p.keyboard.type('22');
  await p.fill('.setrow[data-ex="d1"][data-i="0"] [data-f="reps"]', '10');
  await marcar('d1', 0); await marcar('d1', 1);
  assert.equal(await mini('d1'), false);
  console.log('2 de 3 séries -> minimizado?', await mini('d1'));
  await marcar('d1', 2);
  console.log('logo após a 3ª -> minimizado?', await mini('d1'));
  await p.waitForTimeout(1200);
  assert.equal(await mini('d1'), true);
  assert.equal((await ordem()).at(-1),'d1','Concluído vai para o fim');
  assert.equal((await ordem())[0],'d2','Pendente assume o primeiro lugar');
  console.log('0,7 s depois -> minimizado?', await mini('d1'), '|', (await p.textContent('#ex-d1')).replace(/\s+/g, ' ').trim());
  const pos = await p.evaluate(() => { const t = document.getElementById('tabs').getBoundingClientRect(); const c = document.getElementById('ex-d1').getBoundingClientRect(); const n = document.getElementById('ex-d2').getBoundingClientRect(); return { abas: Math.round(t.bottom), card: Math.round(c.top), proximo: Math.round(n.top), tela: innerHeight }; });
  console.log('rolagem: fim das abas', pos.abas, '| card minimizado em', pos.card, '| próximo exercício em', pos.proximo, 'de', pos.tela);
  await p.screenshot({ path: __dirname + '/prints/mini-d.png' });

  // Abrir e minimizar de novo.
  await p.click('#ex-d1 .minirow');
  console.log('abrir -> minimizado?', await mini('d1'), '| tem botão Minimizar:', await p.locator('#ex-d1 .minbtn').count());
  await p.waitForTimeout(900);
  console.log('continua aberto depois de 0,9 s:', !(await mini('d1')));
  await p.click('#ex-d1 .minbtn');
  console.log('minimizar -> minimizado?', await mini('d1'));

  // Corrigindo um número logo depois da última série: não fecha no meio.
  await marcar('d2', 0); await marcar('d2', 1); await marcar('d2', 2);
  await p.click('.setrow[data-ex="d2"][data-i="2"] [data-editar-serie]');
  await p.waitForTimeout(1000);
  assert.equal(await mini('d2'), false);
  console.log('digitando no card -> minimizado?', await mini('d2'), '(esperado false)');
  await p.click('.band');
  await p.waitForTimeout(1000);
  console.log('saiu do campo -> minimizado?', await mini('d2'));

  // Trocar de aba e voltar mantém.
  await p.click('[data-tab="A"]'); await p.click('[data-tab="C"]');
  assert.equal(await mini('d1'), true); assert.equal(await mini('d2'), true); assert.equal(await mini('d3'), false);
  assert.deepEqual((await ordem()).slice(-2),['d1','d2'],'Mantém ordem de conclusão');
  await p.reload();
  assert.deepEqual((await ordem()).slice(-2),['d1','d2'],'Mantém ordem ao recarregar');
  console.log('trocou de aba e voltou:', await mini('d1'), await mini('d2'), '| outros abertos:', await mini('d3'), await mini('d4'));

  // Desmarcar uma série de um card aberto: fica aberto; marcar de novo: fecha.
  await p.click('#ex-d1 .minirow'); await marcar('d1', 2);
  await p.waitForTimeout(900);
  assert.equal((await ordem())[0],'d1','Desmarcar devolve o exercício aos pendentes');
  console.log('desmarcou 1 série -> minimizado?', await mini('d1'), '| botão Minimizar some depois de redesenhar:', true);
  await marcar('d1', 2); await p.waitForTimeout(900);
  assert.deepEqual((await ordem()).slice(-2),['d2','d1'],'Ao refazer, o exercício vai para o fim da fila');
  console.log('marcou de novo -> minimizado?', await mini('d1'));

  // Finalizar: tudo volta ao normal.
  await p.click('[data-act="finish"]'); await p.click('[data-act="finish"]');
  assert.equal(await p.locator('#workout .mini').count(), 0);
  console.log('depois de finalizar, algum minimizado?', await p.evaluate(() => document.querySelectorAll('#workout .mini').length));

  // Prancha (Treino D, 2 séries) pelo cronômetro.
  await paraOntem(p); // um treino por dia
  await p.click('[data-tab="D"]'); await p.click('[data-act="start"]');
  for (const i of [0, 1]) {
    await p.click(`.setrow[data-ex="d6"][data-i="${i}"] [data-hold]`);
    await p.waitForTimeout(1100);
    await p.click(`.setrow[data-ex="d6"][data-i="${i}"] [data-hold]`);
  }
  await p.waitForTimeout(900);
  assert.equal(await mini('d6'), true);
  console.log('prancha pelo cronômetro -> minimizado?', await mini('d6'), '|', (await p.textContent('#ex-d6 small')));
  assert.deepEqual(erros, [], 'Não deve haver erros de JavaScript inesperados');
  console.log('erros: nenhum');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
