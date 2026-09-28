const assert = require('node:assert/strict');
// Ficha 2 (28/09/2026): checklist do pedido, com asserções.
require('fs').mkdirSync(__dirname + '/prints', { recursive: true });
const { chromium, devices } = require('playwright');
const URL_APP = 'http://127.0.0.1:8766/treino-app/';
const H = h => Date.UTC(2026, 8, 26, h + 3, 10); // 26/09 às h (Brasília)
// Histórico do celular: SEED + D de 26/09 (ficha 1, sem o campo) com supino inclinado 18 kg.
const D26 = { id: 'd26', wid: 'D', start: H(17), end: H(18), sets: {
  d1: [{ kg: 18, reps: 12, done: true }, { kg: 18, reps: 10, done: true }, { kg: 18, reps: 8, done: true }],
  d4: [{ kg: 10, reps: 10, done: true }, { kg: 10, reps: 10, done: true }, { kg: 10, reps: 10, done: true }] } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', timezoneId: 'America/Sao_Paulo', acceptDownloads: true });
  const p = await ctx.newPage();
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL_APP); await p.evaluate(() => localStorage.clear()); await p.reload();
  // Acrescenta o D de 26/09 ao histórico inicial.
  await p.evaluate(d => { const st = JSON.parse(localStorage.getItem('treino-renan-v1')); st.hist.push(d); localStorage.setItem('treino-renan-v1', JSON.stringify(st)); }, D26);
  await p.reload();
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')));
  const cards = () => p.$$eval('#workout .card.ex', cs => cs.map(c => c.id.slice(3) + ':' + c.querySelectorAll('.setrow:not(.head)').length).join(' '));
  const sugestao = async id => { const v = await p.inputValue(`.setrow[data-ex="${id}"][data-i="0"] [data-f="kg"]`).catch(() => '—'); return v; };

  // 1. Próximo treino depois do D de 26/09.
  assert.match(await p.textContent('#today'), /Próximo: A \(Superiores 1\)/);
  console.log('1. cabeçalho:', await p.textContent('#today'), '| aba aberta:', await p.textContent('#tabs [aria-pressed="true"]'));
  console.log('   título:', await p.textContent('.whead h2'), '| foco:', await p.textContent('.whead p'));
  // 2. Adaptação: 2 séries em tudo e aviso.
  assert.match(await p.textContent('.aviso-treino'), /Semana de adaptação/);
  assert.match(await p.textContent('.aviso-treino'), /faltam A, B, C e D/);
  assert.equal(await cards(), 'a1:2 b1:2 e5:2 a2:2 a5:2 a7:2 b5:2');
  assert.ok(await p.locator('.seguranca').isVisible());
  console.log('2. aviso:', await p.textContent('.aviso-treino'));
  console.log('   séries por exercício (A):', await cards());
  console.log('   segurança:', (await p.textContent('.seguranca')).slice(0, 60) + '…');
  console.log('   aquecimento:', (await p.$$eval('.card.warm li span', s => s.map(x => x.textContent))).join(' / '));
  // Aquecimento diz quais exercícios ganham 1 série leve, e o card de cada um avisa.
  assert.equal((await p.$$eval('.card.warm li span', s => s.map(x => x.textContent)))[2], 'Uma série leve antes de cada movimento bem diferente: 2 (puxada frontal) e 5 (elevação lateral com halteres).');
  assert.deepEqual(await p.$$eval('#workout .card.ex', cs => cs.filter(c => c.querySelector('.aquece')).map(c => c.id.slice(3) + ':' + c.querySelector('.aquece').textContent.slice(7, 8))), ['a1:2', 'b1:1', 'a5:1']);
  console.log('   avisos de aquecimento nos cards: a1 (2 a 3 leves), b1 e a5 (1 leve)');
  await p.screenshot({ path: __dirname + '/prints/ficha2-A.png' });

  // 3. Sugestões: extensora 90 kg (C 25/09) e supino inclinado 18 kg (D 26/09).
  await p.click('[data-tab="B"]');
  assert.equal(await sugestao('c2'), '90');
  assert.equal(await sugestao('c1'), '');
  console.log('3. B:', await p.textContent('.whead h2'), '| extensora sugere:', await sugestao('c2'), '| leg press:', await sugestao('c1'), '| aviso pernas:', (await p.textContent('.aviso-treino')).includes('160 kg'));
  console.log('   bird-dog:', (await p.textContent('#ex-e4 .target strong')), '| campos:', await p.$$eval('.setrow[data-ex="e4"][data-i="0"] input', i => i.map(x => x.dataset.f).join(',')));
  await p.click('[data-tab="C"]');
  assert.equal(await sugestao('d1'), '18'); assert.equal(await p.locator('#ex-d4 .pair').count(), 0);
  console.log('   C: supino inclinado sugere:', await sugestao('d1'), '| rosca Scott:', await p.textContent('#ex-d4 .target'), '| par:', await p.locator('#ex-d4 .pair').count());
  console.log('   abas:', (await p.$$eval('#tabs small', s => s.map(x => x.textContent))).join(' | '));

  // 5. Calendário: 25/09 "Pernas e abdômen" e 26/09 "Superior", com cargas.
  await p.click('[data-view="cal"]');
  for (const dia of ['2026-09-25', '2026-09-26']) {
    await p.click(`[data-cd="${dia}"]`);
    await p.click('.entry summary');
    assert.equal(await p.textContent('.entry .et b'), dia.endsWith('25') ? 'Treino C · Pernas e abdômen' : 'Treino D · Superior');
    console.log('5.', dia, ':', await p.textContent('.entry .et b'), '|', (await p.textContent('.entry ul')).trim());
  }
  await p.click('[data-view="treino"]');
  console.log('   últimos treinos:', (await p.$$eval('.hist details summary', s => s.slice(0, 2).map(x => x.textContent))).join(' | '));

  // Faz o ciclo A, B, C e D na ficha nova (marca a 1ª série de cada exercício e finaliza).
  const fazer = async (wid, marcar) => {
    await p.click(`[data-tab="${wid}"]`);
    await p.click('[data-act="start"]');
    await marcar();
    await p.click('#workout > .finish [data-act="finish"]'); await p.click('#workout > .finish [data-act="finish"]');
    await p.waitForTimeout(150);
  };
  const serie1 = async () => { for (const id of await p.$$eval('#workout .card.ex:not(.mini)', cs => cs.map(c => c.id.slice(3)))) { const bt = `.setrow[data-ex="${id}"][data-i="0"] [data-done]`; if (await p.locator(bt).count()) await p.click(bt); } };
  // B com o leg press no topo (15) nas 2 séries.
  const legTopo = async () => { await p.fill('.setrow[data-ex="c1"][data-i="0"] [data-f="kg"]', '100'); await p.fill('.setrow[data-ex="c1"][data-i="0"] [data-f="reps"]', '15');
    await p.click('.setrow[data-ex="c1"][data-i="0"] [data-done]'); await p.click('.setrow[data-ex="c1"][data-i="1"] [data-done]'); };
  await fazer('A', serie1);
  await p.click('[data-tab="B"]');
  assert.match(await p.textContent('.aviso-treino'), /faltam B, C e D/);
  console.log('   depois do A:', await p.textContent('.aviso-treino'));
  await fazer('B', legTopo);
  await p.click('[data-tab="D"]');
  assert.equal(await sugestao('c1'), '100'); assert.equal(await p.locator('#ex-c1 .up').count(), 0);
  console.log('6. leg press depois de 1 treino no topo (100 × 15, 15):', await sugestao('c1'), '| "Hora de subir"?', await p.locator('#ex-c1 .up').count());
  await fazer('C', serie1);
  await p.click('[data-tab="D"]');
  assert.match(await p.textContent('.aviso-treino'), /falta D\)/);
  await fazer('D', async () => { await p.fill('.setrow[data-ex="c1"][data-i="0"] [data-f="kg"]', '100'); await p.fill('.setrow[data-ex="c1"][data-i="0"] [data-f="reps"]', '15');
    await p.click('.setrow[data-ex="c1"][data-i="0"] [data-done]'); await p.click('.setrow[data-ex="c1"][data-i="1"] [data-done]'); });
  const s2 = await st();
  console.log('   treinos salvos com ficha:', s2.hist.filter(h => h.ficha === 2).map(h => h.wid).join(','), '| ficha no antigo:', s2.hist.find(h => h.id === 'd26').ficha);

  // Depois da adaptação: séries das tabelas.
  await p.click('[data-tab="B"]');
  assert.equal(await cards(), 'c1:3 c4:3 c5:2 c2:2 c6:3 a5:3 b6:2 e4:2');
  console.log('4. depois do ciclo, B:', await cards());
  console.log('   aviso:', await p.textContent('.aviso-treino'));
  assert.doesNotMatch(await p.textContent('.aviso-treino'), /adaptação/);
  assert.equal(await sugestao('c1'), '105');
  console.log('6. leg press depois de 2 treinos no topo:', await sugestao('c1'), '| "Hora de subir"?', await p.locator('#ex-c1 .up').textContent().catch(() => 'não'));
  await p.click('[data-tab="A"]');
  console.log('   A:', await cards(), '| aviso:', (await p.textContent('.aviso-treino')).slice(0, 70));
  await p.click('[data-tab="D"]');
  assert.equal(await cards(), 'c4:3 c1:2 c2:2 c5:2 e3:2 c6:2 a5:3 a7:2 d6:2');
  console.log('   D:', await cards());
  await p.screenshot({ path: __dirname + '/prints/ficha2-D.png' });

  // 11. Versão curta no B: 4 exercícios com 2 séries, tronco opcional.
  await p.click('[data-tab="B"]');
  await p.click('[data-curta="ligar"]');
  assert.equal(await cards(), 'c1:2 c4:2 c5:2 c2:2');
  console.log('11. versão curta:', await cards(), '|', await p.textContent('.curta-on'));
  await p.click('[data-curta="tronco"]');
  assert.equal(await cards(), 'c1:2 c4:2 c5:2 c2:2 e4:2');
  console.log('    com tronco:', await cards());
  await p.click('[data-curta="sair"]');
  console.log('    voltar ao completo:', await cards());
  await p.click('#workout > .finish [data-act="discard"]'); await p.click('#workout > .finish [data-act="discard"]');

  // Backup antigo (sem ficha) restaurado num celular limpo.
  const antigo = JSON.stringify({ v: 1, cur: null, hist: [D26], upd: 1 });
  require('fs').writeFileSync(__dirname + '/prints/backup-antigo.json', antigo);
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.setInputFiles('#bkFile', __dirname + '/prints/backup-antigo.json'); await p.waitForTimeout(300);
  console.log('7. restaurar backup antigo:', await p.textContent('#bkMsg'), '| próximo:', await p.textContent('#today'));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bkSave')]);
  const salvo = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  assert.ok(salvo.hist.some(h => h.id === 'd26' && !h.ficha));
  console.log('   backup novo tem o D antigo sem ficha:', salvo.hist.some(h => h.id === 'd26' && !h.ficha));

  // Treino antigo (ficha 1) que ficou aberto antes da atualização.
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('treino-renan-v1')); s.cur = { wid: 'C', start: Date.now() - 600000, sets: {}, warm: {} }; localStorage.setItem('treino-renan-v1', JSON.stringify(s)); });
  await p.reload();
  console.log('8. treino aberto da ficha 1:', await p.textContent('.whead h2'), '|', await cards());
  await p.click('.setrow[data-ex="c3"][data-i="0"] [data-done]');
  await p.click('#workout > .finish [data-act="finish"]'); await p.click('#workout > .finish [data-act="finish"]');
  const s3 = await st();
  assert.equal(s3.hist.slice(-1)[0].ficha, 1);
  console.log('   salvo como ficha:', s3.hist.slice(-1)[0].ficha, '| exercício:', Object.keys(s3.hist.slice(-1)[0].sets).join(','));

  console.log('largura:', await p.evaluate(() => document.documentElement.scrollWidth + ' x ' + innerWidth));
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.deepEqual(erros, [], 'Não deve haver erros de JavaScript inesperados');
  console.log('erros:', erros.length ? erros : 'nenhum');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
