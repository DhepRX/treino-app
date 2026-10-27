const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, devices } = require('playwright');
const URL_APP = 'http://127.0.0.1:8766/treino-app/';
const LS = 'treino-renan-v1';

(async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers:'block', timezoneId:'America/Sao_Paulo' });
    const p = await ctx.newPage(), erros = [];
    p.on('pageerror', e => erros.push(e.message));
    await p.goto(URL_APP);
    await p.evaluate(key => {
      localStorage.clear();
      const hist = ['A','B','C','D'].map((wid, i) => ({ id:'ciclo-' + wid, wid, ficha:2, manual:true, start:Date.UTC(2026,8,20+i,12), end:Date.UTC(2026,8,20+i,12), sets:{} }));
      localStorage.setItem(key, JSON.stringify({ v:1, cur:null, hist, upd:0 }));
    }, LS);
    await p.reload();
    const dados = () => p.evaluate(key => JSON.parse(localStorage.getItem(key)), LS);
    const select = (id, campo) => p.locator(`[data-feedback-ex="${id}"][data-feedback="${campo}"]`);
    const terminar = async () => { await p.click('[data-act="finish"]'); await p.click('[data-act="finish"]'); };

    await p.click('[data-tab="B"]');
    assert.equal(await select('c1','rir').isDisabled(), true, 'Relato não começa um treino sem querer');
    await p.click('[data-curta="ligar"]');
    assert.equal((await dados()).cur.modo, 'curto');
    assert.deepEqual((await dados()).cur.plano, { c1:2, c4:2, c5:2, c2:2 });
    assert.equal(await select('c1','rir').inputValue(), '');
    assert.equal(await select('c1','dor').inputValue(), '', 'Ausência de relato não vira ausência de dor');
    await p.click('#ex-c1 .feedback summary');
    await select('c1','rir').selectOption('2');
    await select('c1','tecnica').selectOption('boa');
    await select('c1','dor').selectOption('sim');
    assert.deepEqual((await dados()).cur.feedback.c1, { rir:2, tecnica:'boa', dor:'sim' });
    await p.reload();
    assert.equal(await select('c1','dor').inputValue(), 'sim', 'Relato sobrevive à recarga');
    assert.equal((await dados()).cur.plano.c1, 2);
    await p.click('#ex-c1 .feedback summary');
    for (const i of [0,1]) await p.click(`.setrow[data-ex="c1"][data-i="${i}"] [data-done]`);
    await p.waitForTimeout(900);
    assert.equal(await p.locator('#ex-c1.mini').count(), 0, 'Responder não é interrompido pela minimização automática');
    await terminar();
    let salvo = (await dados()).hist.at(-1);
    assert.equal(salvo.modo, 'curto');
    assert.deepEqual(salvo.plano, { c1:2, c4:2, c5:2, c2:2 });
    assert.deepEqual(salvo.feedback.c1, { rir:2, tecnica:'boa', dor:'sim' });
    assert.match(await p.textContent('.summary'), /registrou desconforto/);

    // Corrigir relato de um treino curto reaberto preserva a prescrição original.
    await p.click('[data-reabrir]'); await p.click('[data-reabrir]');
    assert.equal(await p.locator('.exlist > li').count(), 4);
    await p.click('#ex-c1 [data-abrir]');
    await p.click('#ex-c1 .feedback summary');
    await select('c1','dor').selectOption('nao');
    await terminar();
    salvo = (await dados()).hist.at(-1);
    assert.equal((await dados()).hist.length, 5, 'Reabrir substitui o mesmo registro');
    assert.equal(salvo.modo, 'curto');
    assert.equal(salvo.plano.c1, 2);
    assert.equal(salvo.feedback.c1.dor, 'nao');

    // Exportar/restaurar em outro aparelho mantém os extras e não inventa dados antigos.
    const downloadPromise = p.waitForEvent('download');
    await p.click('#bkSave');
    const download = await downloadPromise;
    const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.deepEqual(backup.hist.at(-1).feedback, salvo.feedback);
    const ctx2 = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers:'block', timezoneId:'America/Sao_Paulo' });
    const p2 = await ctx2.newPage();
    p2.on('pageerror', e => erros.push(e.message));
    await p2.goto(URL_APP);
    await p2.evaluate(key => { localStorage.clear(); localStorage.setItem(key, JSON.stringify({ v:1, cur:null, hist:[], upd:0 })); }, LS);
    await p2.reload();
    backup.hist[0].feedback = { desconhecido:{ dor:'sim' }, c1:{ rir:99, tecnica:'talvez', dor:'sim', extra:'ignorar' } };
    backup.hist[0].plano = { c1:99, c4:2, desconhecido:3 };
    backup.hist[0].modo = 'inválido';
    await p2.setInputFiles('#bkFile', { name:'backup-teste.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(backup)) });
    await p2.waitForFunction(() => document.querySelector('#bkMsg').textContent.includes('restaurados'));
    const restaurado = await p2.evaluate(key => JSON.parse(localStorage.getItem(key)), LS);
    assert.deepEqual(restaurado.hist.at(-1).feedback, salvo.feedback);
    assert.deepEqual(restaurado.hist.at(-1).plano, salvo.plano);
    assert.deepEqual(restaurado.hist[0].feedback, { c1:{ dor:'sim' } });
    assert.deepEqual(restaurado.hist[0].plano, { c4:2 });
    assert.equal(restaurado.hist[0].modo, undefined);
    assert.equal(restaurado.hist[1].feedback, undefined, 'Registro antigo permanece sem relato');

    // Restaurar uma sessão curta aberta dispensa a chave auxiliar do aparelho de origem.
    const iniciado = { v:1, hist:[], upd:0, cur:{ wid:'D', ficha:2, start:Date.now()-60000, warm:{'0':true,'1':true,'2':true}, sets:{ c4:[{ kg:30,reps:15,done:true }] }, feedback:{ c4:{rir:3,tecnica:'boa',dor:'nao'} }, plano:{c4:2,c1:2,c2:2,c5:2,d6:2}, modo:'curto' } };
    await p2.setInputFiles('#bkFile', { name:'aberto.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(iniciado)) });
    await p2.waitForFunction(() => document.querySelector('#bkMsg').textContent.includes('em andamento restaurado'));
    assert.equal(await p2.locator('.exlist > li').count(), 5);
    assert.equal(await p2.locator('#ex-d6').count(), 1);
    assert.equal(await p2.locator('[data-feedback-ex="c4"][data-feedback="rir"]').inputValue(), '3');
    assert.equal(await p2.locator('.setrow[data-ex="c1"][data-i]').count(), 2);
    await p2.click('[data-curta="sair"]');
    const completo = await p2.evaluate(key => JSON.parse(localStorage.getItem(key)), LS);
    assert.equal(completo.cur.modo, 'completo', 'Troca explícita recalcula o plano');
    assert.ok(Object.keys(completo.cur.plano).length > 5);

    // Interromper antes da primeira série preserva o relato, sem contar presença nem avançar a ficha.
    const ctx3 = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers:'block', timezoneId:'America/Sao_Paulo' });
    const p3 = await ctx3.newPage();
    p3.on('pageerror', e => erros.push(e.message));
    await p3.goto(URL_APP);
    await p3.evaluate(key => { localStorage.clear(); localStorage.setItem(key, JSON.stringify({ v:1,cur:null,hist:[],upd:0 })); }, LS);
    await p3.reload();
    await p3.click('[data-act="start"]');
    await p3.click('#ex-a1 .feedback summary');
    await p3.selectOption('[data-feedback-ex="a1"][data-feedback="dor"]', 'sim');
    await p3.click('[data-act="finish"]'); await p3.click('[data-act="finish"]');
    let interrompido = await p3.evaluate(key => JSON.parse(localStorage.getItem(key)), LS);
    assert.equal(interrompido.cur, null);
    assert.equal(interrompido.hist.length, 1);
    assert.equal(interrompido.hist[0].interrompido, true);
    assert.deepEqual(interrompido.hist[0].sets, {});
    assert.equal(interrompido.hist[0].feedback.a1.dor, 'sim');
    assert.match(await p3.textContent('.summary'), /Relato salvo.*sequência e a frequência não mudaram/);
    await p3.reload();
    assert.match(await p3.textContent('#today'), /Próximo treino: A/);
    assert.match(await p3.textContent('.aviso-treino'), /Depois que você fizer A, B, C e D/);
    assert.equal(await p3.locator('[data-act="start"]').isEnabled(), true);
    await p3.click('#views [data-view="progresso"]');
    assert.equal(await p3.textContent('[data-frequencia="7"]'), '0');
    assert.equal(await p3.textContent('[data-frequencia="28"]'), '0');
    assert.match(await p3.textContent('#vProgresso'), /Há relato recente de dor ou desconforto/);
    await p3.click('#views [data-view="cal"]');
    assert.equal(await p3.locator('#vCal .cal-stats .stat b').nth(1).textContent(), '0');
    assert.match(await p3.textContent('#vCal .entries'), /Interrompido · sem séries concluídas/);
    assert.equal(await p3.locator('#vCal [data-reg-open]').count(), 1, 'Relato interrompido não ocupa o dia');
    await p3.click('#vCal .entries summary');
    assert.match(await p3.textContent('#vCal .feedback-history'), /dor ou desconforto relatado/);

    const downloadInterrompidoPromise = p3.waitForEvent('download');
    await p3.click('#bkSave');
    const downloadInterrompido = await downloadInterrompidoPromise;
    const arquivoInterrompido = fs.readFileSync(await downloadInterrompido.path());
    assert.equal(JSON.parse(arquivoInterrompido).hist[0].interrompido, true);
    await p3.evaluate(key => { localStorage.clear(); localStorage.setItem(key, JSON.stringify({ v:1,cur:null,hist:[],upd:0 })); }, LS);
    await p3.reload();
    await p3.setInputFiles('#bkFile', { name:'interrompido.json', mimeType:'application/json', buffer:arquivoInterrompido });
    await p3.waitForFunction(() => document.querySelector('#bkMsg').textContent.includes('restaurado'));
    interrompido = await p3.evaluate(key => JSON.parse(localStorage.getItem(key)), LS);
    assert.equal(interrompido.hist[0].interrompido, true, 'Backup preserva a distinção do relato interrompido');
    await p3.click('[data-act="start"]');
    await p3.click('.setrow[data-ex="a1"][data-i="0"] [data-done]');
    await p3.click('[data-act="finish"]'); await p3.click('[data-act="finish"]');
    assert.equal((await p3.evaluate(key => JSON.parse(localStorage.getItem(key)), LS)).hist.length, 2);
    await p3.click('#views [data-view="progresso"]');
    assert.equal(await p3.textContent('[data-frequencia="7"]'), '1');
    assert.match(await p3.textContent('#vProgresso'), /Próximo da sequência: Treino B/);
    await p3.click('#views [data-view="cal"]');
    assert.doesNotMatch(await p3.textContent('#vCal'), /Esse dia tem 2 treinos/);

    // Um relato adverso retira imediatamente um aviso positivo, sem perder foco ou respostas.
    await p3.evaluate(key => {
      const hist = ['A','B','C','D'].map((wid, i) => ({ id:'base-' + wid,wid,ficha:2,manual:true,start:Date.UTC(2026,8,20+i,12),end:Date.UTC(2026,8,20+i,12),sets:{} }));
      for (const dias of [3,2]) {
        const start = Date.now() - dias * 86400000;
        hist.push({ id:'topo-' + dias,wid:'A',ficha:2,start,end:start+3600000,sets:{ a1:Array.from({length:3},()=>({kg:20,reps:12,done:true})) },feedback:{ a1:{rir:2,tecnica:'boa',dor:'nao'} },plano:{a1:3},modo:'completo' });
      }
      localStorage.clear(); localStorage.setItem(key,JSON.stringify({v:1,cur:null,hist,upd:0}));
    }, LS);
    await p3.reload(); await p3.click('[data-tab="A"]'); await p3.click('[data-act="start"]');
    assert.equal(await p3.locator('#ex-a1 .up').count(), 1);
    await p3.click('#ex-a1 .feedback summary');
    await p3.selectOption('[data-feedback-ex="a1"][data-feedback="dor"]', 'sim');
    assert.equal(await p3.locator('#ex-a1 .up').count(), 0, 'Desconforto retira aviso de aumento no mesmo momento');
    assert.match(await p3.textContent('#ex-a1 .feedback-alert'), /Rever antes de progredir/);
    assert.deepEqual(erros, []);
    console.log('OK: relatos opcionais, snapshot da ficha, reabertura e backup compatível');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
