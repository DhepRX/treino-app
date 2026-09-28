const assert = require('node:assert/strict');
// Correções da revisão de 28/09/2026, cada uma com asserção.
require('fs').mkdirSync(__dirname + '/prints', { recursive: true });
const { chromium, devices } = require('playwright');
const URL_APP = 'http://127.0.0.1:8766/treino-app/';

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', timezoneId: 'America/Sao_Paulo' })).newPage();
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL_APP); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('treino-renan-v1')); ['A','B','C','D'].forEach((w, i) => s.hist.push({ id:'f2' + w, wid:w, ficha:2, manual:true, start:Date.UTC(2026,8,20+i,12), end:Date.UTC(2026,8,20+i,12), sets:{} })); s.hist.sort((a,b)=>a.start-b.start); localStorage.setItem('treino-renan-v1', JSON.stringify(s)); }); await p.reload(); // ciclo da ficha 2 já feito: séries da tabela
  const row = (id, i) => `.setrow[data-ex="${id}"][data-i="${i}"]`;
  const mini = s => p.evaluate(s => { const r = document.querySelector(s); return r ? r.classList.contains('mini') : null; }, s);
  const salvo = () => p.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')));

  // 1. Aquecimento: o toque que começa o treino deixa o botão marcado na tela nova.
  await p.click('[data-tab="B"]');
  await p.click('[data-warm="0"]');
  assert.equal(await p.getAttribute('[data-warm="0"]', 'aria-pressed'), 'true');
  assert.equal((await salvo()).cur.warm['0'], true);
  console.log('1. aquecimento marcado no primeiro toque:', await p.getAttribute('[data-warm="0"]', 'aria-pressed'));

  // 2. O mesmo exercício em dois treinos (cadeira flexora no B e no D): as séries do B não aparecem no D.
  await p.fill(row('c4', 0) + ' [data-f="kg"]', '40');
  await p.fill(row('c4', 0) + ' [data-f="reps"]', '12');
  await p.click(row('c4', 0) + ' [data-done]');
  assert.equal(await mini(row('c4', 0)), true);
  await p.click('[data-tab="D"]'); await p.waitForTimeout(400);
  assert.equal(await mini(row('c4', 0)), false, 'D não mostra a série feita no B');
  assert.equal(await p.inputValue(row('c4', 0) + ' [data-f="reps"]'), '');
  assert.equal(await p.locator('#workout .restbtn.on').count(), 0, 'O descanso do B não corre no D');
  await p.click('[data-tab="B"]'); await p.waitForTimeout(400);
  assert.equal(await p.locator('#workout .restbtn.on').count(), 1, 'No B, o descanso continua');
  await p.click('#dockBtns [data-rest="skip"]');
  console.log('2. D sem a série do B e sem o descanso dele; no B, tudo continua.');

  // 3. Série aberta para editar volta a ser linha, mesmo trocando de aba no meio.
  await p.click(row('c4', 0) + ' [data-editar-serie]');
  assert.equal(await mini(row('c4', 0)), false);
  await p.click('[data-tab="A"]'); await p.waitForTimeout(400);
  await p.click('[data-tab="B"]');
  assert.equal(await mini(row('c4', 0)), true, 'Depois de trocar de aba, a série volta a ser linha');
  await p.click(row('c4', 0) + ' [data-editar-serie]');
  await p.fill(row('c4', 0) + ' [data-f="reps"]', '13');
  await p.click('.band'); await p.waitForTimeout(500);
  assert.equal(await mini(row('c4', 0)), true);
  assert.equal(await p.textContent(row('c4', 0) + ' .setmini span'), '40 kg × 13');
  console.log('3. editar e trocar de aba: linha de novo |', await p.textContent(row('c4', 0) + ' .setmini span'));

  // 4. Versão curta: o progresso conta só o que aparece, e o número do card do tronco não muda.
  for (const i of [0, 1, 2]) await p.click(row('c6', i) + ' [data-done]'); // panturrilha é o 5º: sai da versão curta
  await p.click('#dockBtns [data-rest="skip"]');
  await p.click('[data-curta="ligar"]');
  assert.match(await p.textContent('#progresso'), /1 de 8 séries feitas/);
  await p.click('[data-curta="tronco"]');
  assert.equal(await p.textContent('#ex-e4 .num'), '5');
  await p.click('#ex-e4 [data-fechar="e4"]');
  assert.equal(await p.textContent('#ex-e4 .num'), '5', 'Minimizado mantém o número');
  await p.click('#ex-e4 [data-abrir="e4"]');
  assert.equal(await p.textContent('#ex-e4 .num'), '5', 'Aberto de novo mantém o número');
  console.log('4. versão curta:', await p.textContent('#progresso'), '| bird-dog é o 5 aberto e minimizado');

  // 5. "Minimizar todos" não passa para o próximo treino.
  await p.click('[data-todos="fechar"]');
  assert.ok(await p.locator('#workout .card.mini').count() >= 5);
  await p.click('#workout .finish [data-act="discard"]'); await p.click('#workout .finish [data-act="discard"]');
  await p.click('[data-tab="D"]'); await p.click('[data-act="start"]');
  assert.equal(await p.locator('#workout .card.mini').count(), 0, 'Treino novo começa com os cards abertos');
  await p.click('#workout .finish [data-act="discard"]'); await p.click('#workout .finish [data-act="discard"]');
  console.log('5. D começa aberto depois de minimizar todos no B.');

  // 6. Treino marcado à mão num dia da ficha 1 fica na ficha 1.
  await p.click('[data-view="cal"]');
  for (let k = 0; k < 36 && !(await p.locator('[data-cd="2026-09-24"]').count()); k++) await p.click('[data-cm="-1"]');
  await p.click('[data-cd="2026-09-24"]');
  await p.click('[data-reg-open]');
  assert.match(await p.textContent('[data-reg="A"]'), /Empurrar/);
  await p.click('[data-reg="A"]');
  const manual = (await salvo()).hist.find(h => h.manual && h.wid === 'A' && new Date(h.start).getDate() === 24);
  assert.equal(manual.ficha, 1);
  assert.ok((await p.$$eval('.entry .et b', s => s.map(x => x.textContent))).includes('Treino A · Empurrar'));
  console.log('6. 24/09 marcado à mão: ficha', manual.ficha, '| nome: Treino A · Empurrar');
  // Hoje vale a ficha atual, igual a um treino feito pelo app.
  await p.click('[data-view="treino"]'); await p.click('#hist [data-gocal]'); // volta o calendário para o mês de hoje
  await p.click('.cd.today'); await p.click('[data-reg-open]');
  assert.match(await p.textContent('[data-reg="A"]'), /Superiores 1/);
  console.log('   hoje:', await p.textContent('[data-reg="A"]'));
  await p.click('[data-reg-cancel]');

  // 7. O aviso de falha ao salvar tem destaque.
  await p.evaluate(() => { document.getElementById('saveWarning').hidden = false; });
  const estilo = await p.evaluate(() => { const s = getComputedStyle(document.getElementById('saveWarning')); return s.borderLeftWidth + ' ' + s.backgroundColor; });
  assert.equal(estilo, '4px rgb(255, 243, 199)');
  console.log('7. aviso de falha ao salvar:', estilo);

  // 7b. Todo exercício da ficha 2 tem o botão "Ver vídeo".
  const semVideo = [];
  await p.click('[data-view="treino"]');
  for (const t of ['A', 'B', 'C', 'D']) {
    await p.click(`[data-tab="${t}"]`); await p.click('[data-todos="abrir"]');
    for (const id of await p.$$eval('#workout .card.ex', cs => cs.map(c => c.id.slice(3)))) if (!(await p.locator(`[data-video="${id}"]`).count())) semVideo.push(t + ':' + id);
  }
  assert.deepEqual(semVideo, [], 'Exercícios sem vídeo: ' + semVideo.join(', '));
  console.log('7b. todos os exercícios da ficha 2 têm vídeo.');

  // 8. Tema claro mesmo com o iPhone no modo escuro.
  const escuro = await (await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', colorScheme: 'dark' })).newPage();
  await escuro.goto(URL_APP);
  assert.equal(await escuro.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(242, 242, 242)');
  await escuro.screenshot({ path: __dirname + '/prints/tema-com-iphone-escuro.png' });
  console.log('8. iPhone no modo escuro: fundo claro.');

  assert.deepEqual(erros, [], 'Não deve haver erros de JavaScript inesperados');
  console.log('erros: nenhum');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
