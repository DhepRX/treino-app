// Dados fictícios: nenhum contexto pessoal é incluído nos testes públicos.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium, devices } = require('playwright');
const URL_APP = 'http://127.0.0.1:8766/treino-app/';
const item = (id, quantidade, unidade='g', base='comestivel') => ({id,nome:id,quantidade,unidade,base,fonte:'teste',status:'Referência de teste'});
const refeicao = (id,tipo,horario,itens) => ({id,dia:1,tipo,titulo:id,horario,itens,preparo:'Preparo fictício',nota:'Referência de teste',fonte:'teste'});
const dados = {tipo:'contexto-rotina',versao:1,rotina:{v:1,atualizado:1,
  fontes:[{id:'teste',titulo:'Documento fictício',data:'2026-10-12',nota:'Somente teste'}],
  referencias:[],refeicoes:[
    refeicao('pre','treino','06:20',[item('leite',200,'ml'),item('banana',40)]),
    refeicao('pos','treino','08:15',[item('leite',200,'ml'),item('banana',40),item('pao',100)]),
    refeicao('cafe','descanso','07:30',[item('leite',400,'ml'),item('banana',80),item('pao',100)]),
    refeicao('lanche','ambos','10:30',[item('banana',80),item('cuscuz',null,'g','pronto')])],
  medidas:[{id:'antiga',data:null,horario:'noite',metodo:'Estimativa de equipamento',condicoes:'Data da medição desconhecida',valores:[{nome:'Peso',valor:70.4,unidade:'kg'}],nota:'Sem diagnóstico',fonte:'teste'}],
  precos:[{id:'cotacao',nome:'Produto fictício',preco:100,peso:1000,porcao:30,proteina:20,frete:0,data:'2026-10-27',unidade:'g',base:'pó',nota:'Referência datada',status:'rótulo fictício'}],
  pendencias:[{id:'porcao',texto:'Confirmar porção',resolvida:false,nota:'',atualizado:1}],orientacoes:[],marcacoes:[],sintomas:[],estoque:[],preparo:[]}};
const arquivo = (obj) => ({name:'contexto-teste.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(obj))});
(async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block',timezoneId:'America/Sao_Paulo',acceptDownloads:true});
    const p = await ctx.newPage(), erros=[]; p.on('pageerror',e=>erros.push(e.message));
    await p.goto(URL_APP);
    await p.click('[data-tab="A"]');await p.click('#ex-a1 [data-i="0"] [data-done]');
    const antes = await p.evaluate(()=>JSON.parse(localStorage.getItem('treino-renan-v1')));
    await p.click('[data-view="rotina"]');
    await p.setInputFiles('#rotinaArquivo',arquivo(dados));
    await p.waitForFunction(()=>JSON.parse(localStorage.getItem('treino-renan-v1')).rotina?.refeicoes.length===4);
    const depois = await p.evaluate(()=>JSON.parse(localStorage.getItem('treino-renan-v1')));
    assert.deepEqual(depois.cur,antes.cur);assert.deepEqual(depois.hist,antes.hist);
    const copia=await p.evaluate(()=>JSON.parse(localStorage.getItem('treino-renan-pre-contexto')));
    assert.deepEqual(copia.cur,antes.cur);assert.deepEqual(copia.hist,antes.hist);
    await p.fill('#rtDia','2026-10-26');await p.locator('#rtDia').dispatchEvent('change');
    await p.selectOption('[data-rt-type="2026-10-26"]','treino');
    await p.check('[data-rt-meal="pre"]');
    await p.fill('[data-rt-time="pre"]','06:45');await p.locator('[data-rt-time="pre"]').dispatchEvent('change');
    await p.setInputFiles('#rotinaArquivo',arquivo(dados));
    assert.equal(await p.inputValue('[data-rt-time="pre"]'),'06:45');
    assert.equal(await p.isChecked('[data-rt-meal="pre"]'),true);
    assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('treino-renan-v1')).rotina.refeicoes.length),4);
    await p.click('[data-rt-tab="compras"]');
    await p.fill('#rtComprasInicio','2026-10-26');await p.locator('#rtComprasInicio').dispatchEvent('change');
    await p.check('[data-rt-shop-day="2026-10-26"]');
    const [lista] = await Promise.all([p.waitForEvent('download'),p.click('#rtExportarCompras')]);
    const texto=await fs.readFile(await lista.path(),'utf8');
    assert.match(texto,/400 ml/,'Duas metades somam uma vitamina diária');
    assert.match(texto,/160 g/,'Banana da vitamina e do lanche são somadas');
    assert.match(texto,/confirmar/i,'Quantidade desconhecida não vira zero');
    await p.fill('[data-rt-stock="leite:ml:comestivel"]','100');await p.locator('[data-rt-stock="leite:ml:comestivel"]').dispatchEvent('change');
    const [lista2] = await Promise.all([p.waitForEvent('download'),p.click('#rtExportarCompras')]);
    assert.match(await fs.readFile(await lista2.path(),'utf8'),/300 ml/);
    await p.click('[data-rt-tab="precos"]');
    assert.equal(await p.textContent('.rt-table tbody tr:first-child td:last-child'),'R$ 15','Custo por 100 g de proteína calculado na embalagem correta');
    assert.match(await p.textContent('#rotinaConteudo'),/2026-10-27/);
    await p.click('[data-rt-tab="medidas"]');
    assert.match(await p.textContent('#rotinaConteudo'),/Data da medição desconhecida/i);
    assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('treino-renan-v1')).rotina.medidas[0].data),null);
    const [backup] = await Promise.all([p.waitForEvent('download'),p.click('#rotinaExportar')]);
    const estadoBackup=JSON.parse(await fs.readFile(await backup.path(),'utf8'));
    assert.ok(estadoBackup.rotina);assert.deepEqual(estadoBackup.cur,antes.cur);
    const p2=await (await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block',timezoneId:'America/Sao_Paulo'})).newPage();
    p2.on('pageerror',e=>erros.push(e.message));await p2.goto(URL_APP);
    await p2.setInputFiles('#bkFile',{name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(estadoBackup))});
    await p2.waitForFunction(()=>!!JSON.parse(localStorage.getItem('treino-renan-v1')).rotina);
    assert.deepEqual(await p2.evaluate(()=>JSON.parse(localStorage.getItem('treino-renan-v1')).rotina),estadoBackup.rotina);
    const malicioso=structuredClone(dados);malicioso.rotina.refeicoes[0].titulo='<img src=x onerror="window.invadiu=true">';
    malicioso.rotina.refeicoes[0].id='malicioso';
    await p.setInputFiles('#rotinaArquivo',arquivo(malicioso));await p.click('[data-rt-tab="refeicoes"]');
    assert.equal(await p.evaluate(()=>window.invadiu),undefined);
    assert.equal(await p.locator('#rotinaConteudo img').count(),0);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),390,'Rotina cabe na tela de celular mesmo com treino em andamento');
    const publico=await fs.readFile(require('node:path').join(__dirname,'..','index.html'),'utf8');
    assert.equal(publico.includes('Dados fictícios'),false);
    assert.deepEqual(erros,[]);
    console.log('Rotina: importação idempotente, cópia anterior, treino preservado, compras/estoque, datas desconhecidas, backup e escape verificados.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
