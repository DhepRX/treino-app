const assert = require('node:assert/strict');
// Minimizar todos, abrir um, o próximo abre sozinho, e repetições que seguem a série 1.
require('fs').mkdirSync(__dirname + '/prints', { recursive: true });
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', colorScheme: 'dark', timezoneId: 'America/Sao_Paulo' })).newPage();
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto('http://127.0.0.1:8766/treino-app/'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('treino-renan-v1')); ['A','B','C','D'].forEach((w, i) => s.hist.push({ id:'f2' + w, wid:w, ficha:2, manual:true, start:Date.UTC(2026,8,20+i,12), end:Date.UTC(2026,8,20+i,12), sets:{} })); s.hist.sort((a,b)=>a.start-b.start); localStorage.setItem('treino-renan-v1', JSON.stringify(s)); }); await p.reload(); // ciclo da ficha 2 já feito: séries da tabela
  const row = (id, i) => `.setrow[data-ex="${id}"][data-i="${i}"]`;
  const minis = () => p.$$eval('#workout .card', cs => cs.map(c => (c.classList.contains('warm') ? 'aq' : c.id.slice(3)) + (c.classList.contains('mini') ? '·' : 'A')).join(' '));
  await p.click('[data-tab="C"]');

  // 1. Minimizar todos.
  await p.click('[data-todos="fechar"]');
  assert.equal(await p.locator('#workout .card:not(.mini)').count(), 0);
  console.log('1. minimizar todos:', await minis(), '(· minimizado, A aberto)');
  console.log('   linhas:', (await p.$$eval('#workout .card.mini small', s => s.map(x => x.textContent))).join(' | '));
  await p.screenshot({ path: __dirname + '/prints/todos-min.png' });

  // 2. Abre só o supino; peso e repetições digitados na série 1 seguem para as outras.
  await p.click('#ex-d1 .minirow');
  console.log('2. abriu o supino:', await minis());
  await p.click(row('d1', 0) + ' [data-f="kg"]'); await p.keyboard.press('Control+A'); await p.keyboard.type('20');
  await p.click(row('d1', 0) + ' [data-f="reps"]'); await p.keyboard.type('10');
  console.log('   série 1: 20 kg e 10 reps -> séries 2 e 3:', await p.inputValue(row('d1', 1) + ' [data-f="kg"]'), await p.inputValue(row('d1', 1) + ' [data-f="reps"]'), '|', await p.inputValue(row('d1', 2) + ' [data-f="kg"]'), await p.inputValue(row('d1', 2) + ' [data-f="reps"]'));
  // Série 3 com 8 reps na mão, depois muda a série 1 para 12: a 3 não muda.
  await p.click(row('d1', 2) + ' [data-f="reps"]'); await p.keyboard.press('Control+A'); await p.keyboard.type('8');
  await p.click(row('d1', 0) + ' [data-f="reps"]'); await p.keyboard.press('Control+A'); await p.keyboard.type('12');
  assert.equal(await p.inputValue(row('d1',1)+' [data-f="reps"]'), '12'); assert.equal(await p.inputValue(row('d1',2)+' [data-f="reps"]'), '8');
  console.log('   série 3 = 8 na mão, série 1 -> 12:', await p.inputValue(row('d1', 1) + ' [data-f="reps"]'), await p.inputValue(row('d1', 2) + ' [data-f="reps"]'), '(esperado 12 e 8)');

  // 3. Faz as 3 séries: supino fecha e a puxada (próxima) abre sozinha.
  for (const i of [0, 1, 2]) await p.click(row('d1', i) + ' [data-done]');
  await p.waitForTimeout(1100);
  assert.equal(await p.locator('#ex-d1.mini').count(), 1); assert.equal(await p.locator('#ex-d2.mini').count(), 0);
  console.log('3. terminou o supino:', await minis());
  const salvo = await p.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')).cur.sets.d1.map(x => x.kg + 'x' + x.reps).join(', '));
  console.log('   salvo:', salvo);

  // 4. Linha minimizada da puxada mostra o progresso; minimizar um card no meio.
  await p.click(row('d2', 0) + ' [data-done]');
  await p.click('#ex-d2 .minbtn');
  console.log('4. puxada com 1 série e minimizada:', await p.textContent('#ex-d2 small'));

  // 5. Abrir todos.
  await p.click('[data-todos="abrir"]');
  console.log('5. abrir todos:', await minis());
  assert.deepEqual(erros, [], 'Não deve haver erros de JavaScript inesperados');
  console.log('erros: nenhum');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
