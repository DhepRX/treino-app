const assert = require('node:assert/strict');
// Série marcada vira uma linha fina.
require('fs').mkdirSync(__dirname + '/prints', { recursive: true });
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', colorScheme: 'dark', timezoneId: 'America/Sao_Paulo' })).newPage();
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto('http://127.0.0.1:8766/treino-app/'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const row = (id, i) => `.setrow[data-ex="${id}"][data-i="${i}"]`;
  const mini = (id, i) => p.evaluate(s => document.querySelector(s).classList.contains('mini'), row(id, i));
  const restVis = (id, i) => p.evaluate(k => { const r = document.querySelector('[data-rs="' + k + '"],[data-rn="' + k + '"]'); return r ? getComputedStyle(r).display !== 'none' : null; }, id + ':' + i);
  const salvo = id => p.evaluate(id => JSON.parse(localStorage.getItem('treino-renan-v1')).cur.sets[id], id);

  await p.click('[data-tab="D"]');
  await p.click(row('d1', 0) + ' [data-f="kg"]'); await p.keyboard.type('18');
  await p.fill(row('d1', 0) + ' [data-f="reps"]', '8');
  await p.click(row('d1', 0) + ' [data-done]');
  assert.equal(await mini('d1', 0), true); assert.equal(await restVis('d1',0), true);
  console.log('1. marcou série 1 -> linha?', await mini('d1', 0), '|', await p.textContent(row('d1', 0) + ' .setmini'), '| descanso dela visível (contando):', await restVis('d1', 0));
  console.log('   séries 2 e 3 continuam com campos:', !(await mini('d1', 1)), !(await mini('d1', 2)), '| peso 18 nelas:', await p.inputValue(row('d1', 1) + ' [data-f="kg"]'));
  await p.click('#dockBtns [data-rest="skip"]'); await p.waitForTimeout(400);
  console.log('   pulou o descanso -> linha de descanso da série 1 visível?', await restVis('d1', 0), '| da série 2:', await restVis('d1', 1));
  await p.screenshot({ path: __dirname + '/prints/serie-mini.png' });

  // Editar: abre os campos, corrige, sai -> volta a ser linha com o valor novo.
  await p.click(row('d1', 0) + ' [data-editar-serie]');
  console.log('2. editar -> campos:', !(await mini('d1', 0)), '| foco em:', await p.evaluate(() => document.activeElement.dataset.f));
  await p.fill(row('d1', 0) + ' [data-f="reps"]', '9');
  await p.click('.band'); await p.waitForTimeout(500);
  console.log('   saiu -> linha?', await mini('d1', 0), '|', await p.textContent(row('d1', 0) + ' .setmini span'), '| salvo:', JSON.stringify((await salvo('d1'))[0]));

  // Desmarcar pela linha.
  await p.click(row('d1', 0) + ' [data-done]');
  assert.equal((await salvo('d1'))[0].done, false); assert.equal(await mini('d1',0), false);
  console.log('3. desmarcou -> campos:', !(await mini('d1', 0)), '| valores:', await p.inputValue(row('d1', 0) + ' [data-f="kg"]'), await p.inputValue(row('d1', 0) + ' [data-f="reps"]'), '| feita:', (await salvo('d1'))[0].done, '| descanso volta:', await restVis('d1', 0));
  await p.click(row('d1', 0) + ' [data-done]');
  console.log('   marcou de novo -> linha:', await mini('d1', 0));

  // Completar o exercício: séries viram linha e o card minimiza.
  await p.click(row('d1', 1) + ' [data-done]'); await p.click(row('d1', 2) + ' [data-done]');
  await p.waitForTimeout(1000);
  console.log('4. 3 séries -> card minimizado:', await p.evaluate(() => document.getElementById('ex-d1').classList.contains('mini')), '|', (await p.textContent('#ex-d1 small')));
  await p.click('#ex-d1 .minirow');
  console.log('   abrir o card -> séries em linha:', await mini('d1', 0), await mini('d1', 1), await mini('d1', 2));

  // Par sem descanso (rosca Scott): a nota "Sem descanso" some depois de feita.
  await p.click(row('d4', 0) + ' [data-f="kg"]'); await p.keyboard.type('10');
  await p.click(row('d4', 0) + ' [data-done]');
  console.log('5. rosca Scott série 1 -> linha:', await mini('d4', 0), '|', await p.textContent(row('d4', 0) + ' .setmini span'), '| nota "sem descanso" visível:', await restVis('d4', 0), '| da série 2:', await restVis('d4', 1));

  // Prancha pelo cronômetro.
  await p.click(row('d6', 0) + ' [data-hold]'); await p.waitForTimeout(1100); await p.click(row('d6', 0) + ' [data-hold]');
  console.log('6. prancha pelo cronômetro -> linha:', await mini('d6', 0), '|', await p.textContent(row('d6', 0) + ' .setmini span'));

  // Recarregar mantém as linhas.
  await p.reload(); await p.click('[data-tab="D"]');
  assert.equal(await mini('d4',0), true); assert.equal(await mini('d6',0), true);
  console.log('7. recarregou -> d4 série 1 em linha:', await mini('d4', 0), '| d6:', await mini('d6', 0));
  assert.deepEqual(erros, [], 'Não deve haver erros de JavaScript inesperados');
  console.log('erros: nenhum');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
