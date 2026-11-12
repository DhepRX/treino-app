const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');
// Origem fictícia: os testes não alteram site, conta ou dados pessoais.
const URL_APP = 'http://treino-bordas.test/treino-app/';
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const base = () => ({ v:1, cur:null, hist:[], upd:0, preferenciasTreino:{ adaptacaoConcluida:true } });
const linha = (id, i) => '.setrow[data-ex="' + id + '"][data-i="' + i + '"]';
(async () => {
  const browser = await chromium.launch();
  const erros = [];
  async function pagina(estado = base()){
    const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers:'block', timezoneId:'America/Sao_Paulo' });
    await ctx.route('**/*', route => route.request().url() === URL_APP
      ? route.fulfill({ contentType:'text/html; charset=utf-8', body:html })
      : route.abort());
    await ctx.addInitScript(d => {
      if (!localStorage.getItem('treino-renan-v1')) localStorage.setItem('treino-renan-v1', JSON.stringify(d));
    }, estado);
    const p = await ctx.newPage(); p.on('pageerror', e => erros.push(e.message));
    await p.goto(URL_APP);
    return p;
  }
  const ler = p => p.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')));
  const finalizar = async p => { await p.click('[data-act="finish"]'); await p.click('[data-act="finish"]'); };
  try {
    // A 3ª série e um exercício retirado pela versão curta continuam feitos,
    // mas não substituem as duas séries do novo plano.
    const p = await pagina(); await p.click('[data-tab="B"]');
    await p.click(linha('c1', 2) + ' [data-done]');
    await p.click(linha('c6', 0) + ' [data-done]');
    await p.click('[data-aquec-feito="c1:0"]');
    await p.click('[data-curta="ligar"]');
    assert.match(await p.textContent('#progresso'), /0 de 8 séries feitas.*Mais 2 séries já feitas/);
    assert.equal(await p.locator('#ex-c1.mini').count(), 0, 'Série oculta não conclui o exercício do plano');
    await finalizar(p);
    assert.match(await p.textContent('.summary'), /2 séries de trabalho no total\. 0 de 8 no plano atual/);
    const h = (await ler(p)).hist.at(-1);
    assert.equal(Object.values(h.sets).flat().filter(s => s?.done).length, 2);
    assert.equal(h.encerramento, 'reduzido');
    assert.equal(h.aquecimento.c1[0].done, true, 'Aquecimento não entra no total executado');
    await p.context().close();

    // Desmarcar cancela só o descanso da própria série, de qualquer tipo.
    const q = await pagina(); await q.click('[data-tab="A"]');
    await q.click(linha('a1', 0) + ' [data-done]');
    assert.equal(await q.getAttribute('.restbtn.on', 'data-rs'), 'a1:0');
    await q.click(linha('a1', 0) + ' [data-done]');
    assert.equal(await q.locator('.restbtn.on').count(), 0);
    assert.match(await q.textContent('#dockLabel'), /em andamento/);
    await q.click(linha('a1', 0) + ' [data-done]');
    await q.click('[data-aquec-feito="a1:0"]');
    await q.click(linha('a1', 0) + ' [data-done]');
    assert.equal(await q.getAttribute('.restbtn.on', 'data-rs'), 'aquec-a1:0');
    await q.click('[data-aquec-feito="a1:0"]');
    assert.equal(await q.locator('.restbtn.on').count(), 0);
    // Remover A1 não reinicia nem cancela o descanso de A2, que passa a ser A1.
    await q.fill('#aquec-a1-0-kg', '10');
    await q.click('[data-aquec-feito="a1:1"]');
    await q.click('[data-aquec-ajustes="a1:0"] summary');
    const antes = await q.textContent('#dockClock');
    await q.click('[data-aquec-remover="a1:0"]');
    assert.equal(await q.getAttribute('.restbtn.on', 'data-rs'), 'aquec-a1:0');
    assert.ok(await q.textContent('#dockClock') <= antes);
    assert.equal((await ler(q)).cur.aquecimento.a1.length, 1);
    assert.equal((await ler(q)).cur.aquecimento.a1[0].done, true);
    await q.reload();
    assert.equal(await q.locator('#ex-a1 [data-aquec-linha]').count(), 1);
    await q.click('[data-tab="B"]');
    assert.equal(await q.locator('#workout [data-aquec-linha]').count(), 0, 'Aquecimento não vaza para outro treino');
    await q.context().close();

    // Cargas que a versão anterior aceitou continuam editáveis no aquecimento
    // de exercícios sem carga prescrita ou medidos em segundos.
    for (const [wid, ex, reps] of [['B','e4',5], ['D','d6',15]]) {
      const d = base();
      d.cur = { wid, ficha:2, start:Date.now(), sets:{}, warm:{}, aquecimento:{ [ex]:[{kg:4,reps,done:true,rest:45}] } };
      const r = await pagina(d);
      await r.click('[data-aquec-ajustes="' + ex + ':0"] summary');
      assert.equal(await r.inputValue('#aquec-' + ex + '-0-kg'), '4');
      await r.fill('#aquec-' + ex + '-0-kg', '2,5');
      assert.match(await r.textContent('[data-aquec-editar="' + ex + ':0"] span'), /2,5 kg/);
      await r.reload();
      assert.equal((await ler(r)).cur.aquecimento[ex][0].kg, 2.5);
      await r.click('[data-aquec-editar="' + ex + ':0"]');
      await r.fill('#aquec-' + ex + '-0-reps', '12');
      await r.click('[data-aquec-feito="' + ex + ':0"]');
      await r.click('[data-aquec-feito="' + ex + ':0"]');
      assert.equal((await ler(r)).cur.aquecimento[ex][0].reps, 12);
      assert.deepEqual((await ler(r)).cur.sets, {});
      await r.context().close();
    }

    const vazio = await pagina(); await vazio.click('[data-tab="A"]');
    await vazio.click(linha('a1', 0) + ' [data-done]'); await finalizar(vazio);
    assert.equal((await ler(vazio)).hist[0].aquecimento, undefined, 'Sugestões não utilizadas não criam registros');
    assert.deepEqual(erros, []);
    console.log('Bordas de treino: total executado x plano curto, descanso ao desmarcar/remover, carga legada de aquecimento e sugestões sem registro verificados.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
