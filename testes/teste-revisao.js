const assert = require('node:assert/strict');
// Correções da revisão: treino esquecido aberto, relógio com horas, finalizar sem séries, resumo sem "0 kg".
require('fs').mkdirSync(__dirname + '/prints', { recursive: true });
const { chromium, devices } = require('playwright');
const URL_APP = 'http://127.0.0.1:8766/treino-app/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', timezoneId: 'America/Sao_Paulo' })).newPage();
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL_APP);
  const comTreino = async (horasAtras, sets) => {
    await p.evaluate(({ h, sets }) => {
      const st = JSON.parse(localStorage.getItem('treino-renan-v1'));
      st.cur = { wid: 'D', start: Date.now() - h * 3600000, sets, warm: {} };
      localStorage.setItem('treino-renan-v1', JSON.stringify(st));
    }, { h: horasAtras, sets });
    await p.reload(); await p.waitForTimeout(400);
  };
  const hist = () => p.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')).hist);

  // 1. Treino esquecido aberto desde ontem.
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await comTreino(26, { d1: [{ kg: 18, reps: 8, done: true }, null, null] });
  console.log('1. cabeçalho:', await p.textContent('#today'));
  console.log('   aviso:', await p.textContent('.aviso-aberto'));
  console.log('   dock:', (await p.textContent('#dock')).replace(/\s+/g, ' ').trim());
  const antes = (await hist()).length;
  await p.click('.startrow [data-act="finish"]'); await p.click('.startrow [data-act="finish"]');
  const ult = (await hist()).find(h => h.wid === 'D' && !h.manual);
  assert.equal((await hist()).length, antes+1); assert.equal(Math.round((ult.end-ult.start)/60000),50);
  console.log('   finalizou: entradas', antes, '->', (await hist()).length, '| duração salva:', Math.round((ult.end - ult.start) / 60000), 'min (Treino D = 50) |', await p.textContent('.summary p'));

  // 2. Relógio passando de 1 hora.
  await comTreino(1.26, {});
  console.log('2. relógio com 1h15:', await p.textContent('#dockClock'), '| cabeçalho:', await p.textContent('#today'), '| progresso:', await p.textContent('#progresso'));

  // 3. Finalizar sem nenhuma série.
  await p.click('[data-tab="D"]');
  await p.click('#workout > .finish [data-act="finish"]'); await p.click('#workout > .finish [data-act="finish"]');
  await p.waitForTimeout(200);
  assert.equal((await hist()).length, antes+1);
  console.log('3. sem séries:', await p.textContent('#live'), '| entradas continuam', (await hist()).length);

  // 4. Exercício sem peso anotado: resumo sem "0 kg".
  await p.click('[data-act="start"]');
  for (const i of [0, 1, 2]) { await p.fill(`.setrow[data-ex="d2"][data-i="${i}"] [data-f="kg"]`, ''); await p.click(`.setrow[data-ex="d2"][data-i="${i}"] [data-done]`); }
  await p.waitForTimeout(1000);
  console.log('4. card sem peso:', await p.textContent('#ex-d2 small'), '| linha da série:', await p.evaluate(() => { const c = document.querySelector('#ex-d2'); return c.classList.contains('mini'); }));
  await p.click('#workout > .finish [data-act="finish"]'); await p.click('#workout > .finish [data-act="finish"]');
  await p.click('.summary [data-gocal]');
  await p.click('.entry summary');
  assert.equal((await p.textContent('.entry ul')).includes('0 kg'), false);
  console.log('   histórico:', (await p.textContent('.entry ul')).trim());

  assert.deepEqual(erros, [], 'Não deve haver erros de JavaScript inesperados');
  console.log('erros: nenhum');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
