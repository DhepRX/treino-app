const assert = require('node:assert/strict');
// Backup automático no GitHub, com a API do GitHub simulada.
require('fs').mkdirSync(__dirname + '/prints', { recursive: true });
const { chromium, devices } = require('playwright');
const URL_APP = 'http://127.0.0.1:8766/treino-app/';

// GitHub de mentira: repositório privado DhepRX/treino-dados e público DhepRX/publico.
const gh = { arquivo: null, sha: null, puts: [], semRede: false, segurarPut: false };
async function api(route) {
  if (gh.semRede) return route.abort('internetdisconnected');
  const req = route.request(), url = new URL(req.url()), auth = req.headers()['authorization'];
  const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (auth !== 'Bearer github_pat_BOM1234') return json(401, { message: 'Bad credentials' });
  const m = url.pathname.match(/^\/repos\/DhepRX\/(treino-dados|publico)(\/contents\/backup\.json)?$/);
  if (!m) return json(404, { message: 'Not Found' });
  if (!m[2]) return json(200, { full_name: 'DhepRX/' + m[1], private: m[1] === 'treino-dados' });
  if (req.method() === 'GET') {
    if (!gh.arquivo) return json(404, { message: 'Not Found' });
    if ((req.headers()['accept'] || '').includes('raw')) return route.fulfill({ status: 200, contentType: 'text/plain', body: gh.arquivo });
    return json(200, { sha: gh.sha });
  }
  if (req.method() === 'PUT') {
    // Envio que nunca responde: simula o iPhone fechando o app no meio.
    if (gh.segurarPut) { gh.segurarPut = false; return new Promise(() => {}); }
    const b = JSON.parse(req.postData());
    if (gh.sha && b.sha !== gh.sha) return json(409, { message: 'sha mismatch' });
    gh.arquivo = Buffer.from(b.content, 'base64').toString('utf8');
    gh.sha = 'sha' + (gh.puts.length + 1);
    gh.puts.push(b.message);
    return json(gh.puts.length === 1 ? 201 : 200, { content: { sha: gh.sha } });
  }
  return json(405, {});
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', timezoneId: 'America/Sao_Paulo' });
  await ctx.route('https://api.github.com/**', api);
  const p = await ctx.newPage();
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL_APP); await p.evaluate(() => localStorage.clear()); await p.reload();
  const status = () => p.textContent('#nvStatus');
  const msg = () => p.textContent('#nvMsg');

  console.log('1. início:', await status());
  await p.click('#nvConfig summary');
  console.log('   repositório já preenchido:', await p.inputValue('#nvRepo'));

  await p.fill('#nvToken', 'github_pat_ERRADO'); await p.click('#nvLigar'); await p.waitForTimeout(300);
  console.log('2. chave errada:', await msg());

  await p.fill('#nvRepo', 'DhepRX/publico'); await p.fill('#nvToken', 'github_pat_BOM1234'); await p.click('#nvLigar'); await p.waitForTimeout(300);
  console.log('3. repositório público:', await msg(), '| continua desligado:', await status());

  await p.fill('#nvRepo', 'https://github.com/DhepRX/treino-dados/'); await p.click('#nvLigar'); await p.waitForTimeout(600);
  console.log('4. ligar:', await msg());
  console.log('   status:', await status(), '| campo da chave vazio:', (await p.inputValue('#nvToken')) === '', '| dica:', await p.getAttribute('#nvToken', 'placeholder'));
  const local = JSON.parse(await p.evaluate(() => localStorage.getItem('treino-renan-v1')));
  assert.equal(gh.arquivo, JSON.stringify(local));
  console.log('   no GitHub: commit', JSON.stringify(gh.puts[0]), '| treinos:', JSON.parse(gh.arquivo).hist.length, '| igual ao celular:', gh.arquivo === JSON.stringify(local));
  console.log('   "último backup" do manual também atualizou:', await p.textContent('#bkLast'));

  // 5. Finaliza um treino: vai sozinho.
  await p.click('[data-tab="C"]');
  await p.click('.setrow[data-ex="d1"][data-i="0"] [data-f="kg"]'); await p.keyboard.type('22');
  await p.click('.setrow[data-ex="d1"][data-i="0"] [data-done]');
  await p.click('[data-act="finish"]'); await p.click('[data-act="finish"]');
  console.log('5. logo depois de finalizar:', await status());
  await p.waitForTimeout(2500);
  console.log('   depois:', await status(), '| commits:', gh.puts.length, '| treinos no GitHub:', JSON.parse(gh.arquivo).hist.length);

  // 6. Sem internet: registra um treino no calendário, falha, e envia quando o sinal volta.
  gh.semRede = true;
  await p.click('[data-view="cal"]'); await p.click('[data-reg-open]'); await p.click('[data-reg="X"]');
  await p.waitForTimeout(2500);
  console.log('6. sem internet:', await status(), '| commits:', gh.puts.length);
  gh.semRede = false;
  await p.evaluate(() => window.dispatchEvent(new Event('online')));
  await p.waitForTimeout(800);
  console.log('   sinal voltou:', await status(), '| commits:', gh.puts.length, '| treinos no GitHub:', JSON.parse(gh.arquivo).hist.length);

  // 7. Celular novo: mesma configuração, sem os treinos novos. Restaurar do GitHub.
  const p2 = await (await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' })).newPage();
  await p2.context().route('https://api.github.com/**', api);
  p2.on('pageerror', e => erros.push('p2: ' + e.message));
  await p2.goto(URL_APP);
  await p2.evaluate(() => localStorage.clear());
  await p2.reload();
  const antes = await p2.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')).hist.length);
  await p2.click('[data-tab="C"]');
  await p2.click('.setrow[data-ex="d1"][data-i="0"] [data-done]');
  const remotoAntes = gh.arquivo, putsAntes = gh.puts.length;
  await p2.click('#nvConfig summary'); await p2.fill('#nvToken', 'github_pat_BOM1234'); await p2.click('#nvLigar');
  await p2.waitForFunction(()=>document.querySelector('#nvMsg').textContent.includes('Histórico recuperado'));
  assert.equal(gh.arquivo, remotoAntes, 'Configurar celular novo deve preservar o backup remoto');
  assert.equal(gh.puts.length, putsAntes);
  await p2.click('#nvRestaurar'); await p2.waitForTimeout(500);
  assert.equal(gh.arquivo, remotoAntes);
  const depois = await p2.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')).hist.length);
  assert.equal(depois, 10); assert.equal(antes, 8);
  assert.equal(await p2.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')).cur.sets.d1[0].done), true, 'Recuperar histórico deve manter treino local em andamento');
  console.log('7. celular novo:', antes, 'treinos ->', depois, '|', await p2.textContent('#nvMsg'));

  // 7b. O iPhone fecha o app no meio do envio: ao abrir de novo, o backup vai.
  const pa = await ctx.newPage(); pa.on('pageerror', e => erros.push('pa: ' + e.message));
  await pa.goto(URL_APP);
  gh.segurarPut = true;
  const putsMeio = gh.puts.length;
  await pa.click('[data-view="cal"]'); await pa.click('[data-reg-open]'); await pa.click('[data-reg="X"]');
  await pa.waitForTimeout(2500);
  assert.equal(await pa.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-nuvem')).pendente), true, 'Pendente continua gravado durante o envio');
  await pa.close();
  const pb = await ctx.newPage(); pb.on('pageerror', e => erros.push('pb: ' + e.message));
  await pb.goto(URL_APP);
  await pb.waitForFunction(() => !JSON.parse(localStorage.getItem('treino-renan-nuvem')).pendente);
  const localAgora = await pb.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')).hist.length);
  assert.equal(gh.puts.length, putsMeio + 1);
  assert.equal(JSON.parse(gh.arquivo).hist.length, localAgora);
  console.log('7b. app fechado no meio do envio: ao abrir, enviou | treinos no GitHub:', JSON.parse(gh.arquivo).hist.length);
  await pb.close();

  // 8. Chave vencida depois de ligada.
  await p.evaluate(() => { const n = JSON.parse(localStorage.getItem('treino-renan-nuvem')); n.token = 'github_pat_VENCIDA'; localStorage.setItem('treino-renan-nuvem', JSON.stringify(n)); });
  await p.reload(); await p.click('[data-view="cal"]'); await p.click('[data-reg-open]'); await p.click('[data-reg="X"]'); await p.waitForTimeout(2500);
  console.log('8. chave vencida:', await status());
  // 8b. Cola uma chave nova: o treino que falhou com a chave vencida vai junto.
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-nuvem')).pendente), true);
  const putsAntes8 = gh.puts.length;
  await p.click('#nvConfig summary'); await p.fill('#nvToken', 'github_pat_BOM1234'); await p.click('#nvLigar');
  await p.waitForFunction(() => document.querySelector('#nvMsg').textContent.includes('enviado'));
  assert.equal(gh.puts.length, putsAntes8 + 1);
  const local8 = await p.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-v1')).hist.length);
  assert.equal(JSON.parse(gh.arquivo).hist.length, local8, 'O GitHub fica com todos os treinos');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('treino-renan-nuvem')).pendente), false);
  console.log('8b. chave nova:', await p.textContent('#nvMsg'), '| treinos no GitHub:', local8);
  await p.click('#nvConfig summary');

  // 9. Desligar (dois toques) apaga a chave.
  await p.click('#nvConfig summary'); await p.click('#nvDesligar'); await p.click('#nvDesligar');
  assert.deepEqual(JSON.parse(await p.evaluate(()=>localStorage.getItem('treino-renan-nuvem'))), {});
  console.log('9. desligar:', await status(), '| chave no celular:', await p.evaluate(() => localStorage.getItem('treino-renan-nuvem')));

  // Arquivo inválido não habilita envios nem altera o backup existente.
  const p3 = await (await browser.newContext({ ...devices['iPhone 13'], serviceWorkers:'block', timezoneId:'America/Sao_Paulo' })).newPage();
  await p3.context().route('https://api.github.com/**', api);
  p3.on('pageerror', e => erros.push(e.message));
  const putsInvalidos = gh.puts.length;
  gh.arquivo = '{invalido';
  await p3.goto(URL_APP); await p3.click('#nvConfig summary');
  await p3.fill('#nvToken', 'github_pat_BOM1234'); await p3.click('#nvLigar');
  await p3.waitForFunction(() => document.querySelector('#nvMsg').textContent.includes('inválido'));
  assert.equal(gh.puts.length, putsInvalidos);
  assert.equal(gh.arquivo, '{invalido');
  assert.equal(await p3.evaluate(() => localStorage.getItem('treino-renan-nuvem')), null);
  console.log('10. backup inválido: preservado, configuração não ativada.');
  assert.deepEqual(erros, [], 'Não deve haver erros de JavaScript inesperados');
  console.log('erros: nenhum');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
