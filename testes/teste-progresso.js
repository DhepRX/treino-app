const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const URL_APP = 'http://127.0.0.1:8766/treino-app/';
const inicio = dias => { const d = new Date(); d.setDate(d.getDate() - dias); d.setHours(7, 0, 0, 0); return +d; };
const adequado = { rir:3, tecnica:'boa', dor:'nao' };
const ciclo = ['A','B','C','D'].map((wid, i) => ({ id:'ciclo-' + wid, wid, ficha:2, manual:true, start:inicio(50 - i), end:inicio(50 - i), sets:{} }));
function sessao(dias, { id='a1', wid='A', ficha=2, n=3, reps=12, kg=20, feedback=adequado, modo='completo' } = {}) {
  const start = inicio(dias);
  return { id:'s-' + start, wid, ficha, start, end:start + 3600000, modo, plano:{ [id]:n },
    sets:{ [id]:Array.from({ length:n }, (_, i) => ({ done:true, kg:Array.isArray(kg) ? kg[i] : kg, reps:Array.isArray(reps) ? reps[i] : reps })) },
    ...(feedback ? { feedback:{ [id]:feedback } } : {}) };
}
(async () => {
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ ...devices['iPhone 13'], timezoneId:'America/Sao_Paulo', serviceWorkers:'block' });
    const p = await ctx.newPage(), erros = [];
    p.on('pageerror', e => erros.push(e.message));
    await p.goto(URL_APP);
    const estado = async (hist, cur = null) => {
      await p.evaluate(s => { localStorage.clear(); localStorage.setItem('treino-renan-v1', JSON.stringify(s)); }, { v:1, cur, hist:ciclo.concat(hist), upd:1 });
      await p.reload();
      await p.click('[data-view="progresso"]');
    };
    const card = (id='a1') => p.locator('[data-ex-progress="' + id + '"]');
    const status = (id='a1') => card(id).getAttribute('data-status');
    const topo = [sessao(5), sessao(3)];
    await estado(topo);
    assert.equal(await status(), 'avaliar');
    assert.match(await card().textContent(), /menor incremento disponível/);
    assert.match(await card().textContent(), /20 kg × 12/);
    assert.equal(await p.textContent('[data-frequencia="7"]'), '2');
    await p.click('[data-view="treino"]'); await p.click('[data-tab="A"]');
    assert.equal(await p.inputValue('#ex-a1 [data-i="0"] [data-f="kg"]'), '20', 'A leitura não aumenta a carga preenchida');
    assert.equal(await p.locator('#ex-a1 .up').count(), 1);
    await ctx.setOffline(true); await p.click('[data-view="progresso"]');
    assert.equal(await status(), 'avaliar', 'A interpretação funciona offline');
    await ctx.setOffline(false);

    await estado([sessao(5, { feedback:null }), sessao(3, { feedback:null })]);
    assert.equal(await status(), 'relato', 'Relato ausente não é interpretado como técnica/sintomas normais');
    await p.click('[data-view="treino"]'); await p.click('[data-tab="A"]');
    assert.equal(await p.locator('#ex-a1 .up').count(), 0);
    await estado([sessao(5), sessao(3, { feedback:{ ...adequado, dor:'sim' } })]);
    assert.equal(await status(), 'revisar');
    assert.match(await card().textContent(), /Não aumente a carga/);
    const interrompido = { ...sessao(1, { n:0, feedback:{ dor:'sim' } }), interrompido:true };
    await estado(topo.concat(interrompido));
    assert.equal(await status(), 'revisar', 'Relato de dor sem séries concluídas também impede progressão');
    assert.match(await card().textContent(), /Sem séries concluídas; relato registrado/);
    await estado([sessao(5), sessao(3, { feedback:{ ...adequado, tecnica:'ajustar' } })]);
    assert.equal(await status(), 'revisar');
    await estado([sessao(5), sessao(3, { feedback:{ ...adequado, rir:0 } })]);
    assert.equal(await status(), 'reserva');

    await estado([sessao(5, { id:'c1', wid:'B', kg:100, reps:15 }), sessao(3, { id:'c1', wid:'D', kg:100, reps:15, n:2, feedback:{ ...adequado, rir:1 } })]);
    assert.equal(await status('c1'), 'reserva', 'Pernas exigem ao menos 2 repetições de reserva no relato');
    await estado([sessao(5, { reps:9 }), sessao(3, { reps:10 })]);
    assert.equal(await status(), 'manter');
    assert.match(await card().textContent(), /3 repetições a mais, com a mesma quantidade de séries e carga/);
    await estado([sessao(5), sessao(3, { kg:[20,20,18] })]);
    assert.equal(await status(), 'manter');
    assert.match(await card().textContent(), /As cargas variaram/);
    await p.click('[data-view="treino"]'); await p.click('[data-tab="A"]');
    assert.equal(await p.inputValue('#ex-a1 [data-i="0"] [data-f="kg"]'), '18', 'Usa a carga mais recente quando a última série foi reduzida');
    await estado([sessao(5), sessao(3, { n:2 })]);
    assert.match(await card().textContent(), /Quantidades de séries diferentes/);

    await estado([sessao(5, { id:'a2', n:2 }), sessao(3, { id:'a2', n:2, modo:'curto' })]);
    assert.equal(await status('a2'), 'manter', 'Modo curto não conta como duas sessões completas em exercício de 2 séries');
    assert.match(await card('a2').textContent(), /sessão curta, de adaptação/);
    await estado([sessao(5, { ficha:1 }), sessao(3)]);
    assert.equal(await status(), 'dados', 'Não compara desempenhos de fichas diferentes');
    assert.match(await card().textContent(), /Ainda falta outra sessão/);
    await estado([sessao(5, { id:'d6', wid:'D', kg:null, n:2, reps:40, feedback:{ tecnica:'boa', dor:'nao' } }), sessao(3, { id:'d6', wid:'D', kg:null, n:2, reps:40, feedback:{ tecnica:'boa', dor:'nao' } })]);
    assert.equal(await status('d6'), 'manter');
    assert.match(await card('d6').textContent(), /não aumenta automaticamente o tempo/);

    await estado(topo, { wid:'A', ficha:2, start:Date.now() - 60000, sets:{}, warm:{}, modo:'adaptacao', plano:{ a1:2 } });
    assert.equal(await status(), 'manter', 'Snapshot de adaptação reaberto suspende a progressão');
    assert.match(await card().textContent(), /Focar na sessão reduzida/);
    const duplicado = { ...sessao(3), id:'mesmo-dia-manual', manual:true, sets:{} };
    const futuro = sessao(-2);
    await estado(topo.concat(duplicado, futuro));
    assert.equal(await p.textContent('[data-frequencia="7"]'), '2', 'Conta dias únicos e somente dentro do período');
    assert.equal(await p.textContent('[data-frequencia="28"]'), '2');
    await estado([]);
    assert.equal(await p.textContent('[data-frequencia="7"]'), '0');
    assert.match(await p.textContent('#vProgresso'), /Finalize um treino com séries anotadas/);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), 390, 'Progresso cabe na tela de celular');
    assert.deepEqual(erros, []);
    console.log('Progresso: comparação offline, frequência, relatos ausentes/negativos, séries/cargas incompatíveis, modos reduzidos e histórico legado verificados.');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
