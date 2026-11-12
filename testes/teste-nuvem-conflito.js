// Backups divergentes: duas instalações, API simulada e nenhum token real.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, devices } = require('playwright');
const APP = 'http://backup-conflito.test/treino-app/';
const LS = 'treino-renan-v1', NV = 'treino-renan-nuvem', COPIA = 'treino-renan-nuvem-anterior';
const clone = value => JSON.parse(JSON.stringify(value));
const sha = n => n.toString(16).padStart(40, '0');
const treino = (id, dia, kg = 10) => ({ id, wid:'A', ficha:2, start:Date.UTC(2026,8,dia,12), end:Date.UTC(2026,8,dia,13), sets:{a1:[{kg,reps:10,done:true}]} });
const estado = hist => ({v:1,cur:null,hist,upd:1});
const config = (base, extra={}) => ({repo:'teste/privado',token:'token-ficticio',pendente:true,ultimo:0,erro:'',...(base ? {sha:base} : {}),...extra});

(async()=>{
  const html=await fs.readFile(path.join(__dirname,'..','index.html'),'utf8');
  const browser=await chromium.launch();
  const erros=[];
  try {
    const makeRemote = (data, n=1) => ({data:clone(data),sha:sha(n),n,puts:[],attempts:[],race:null});
    async function page(data,nv,repos,options={}){
      const ctx=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block',timezoneId:'America/Sao_Paulo',acceptDownloads:true});
      await ctx.addInitScript(({data,nv,failCopy})=>{
        if(!localStorage.getItem('treino-renan-v1')){
          localStorage.setItem('treino-renan-v1',JSON.stringify(data));
          localStorage.setItem('treino-renan-nuvem',JSON.stringify(nv));
        }
        if(failCopy){
          const set=Storage.prototype.setItem;
          Storage.prototype.setItem=function(k,v){if(k==='treino-renan-nuvem-anterior')throw new DOMException('Simulação','QuotaExceededError');return set.call(this,k,v);};
        }
      },{data,nv,failCopy:!!options.failCopy});
      const p=await ctx.newPage();p.on('pageerror',e=>erros.push(e.message));
      await p.route('**/*',async route=>{
        const req=route.request(),url=new URL(req.url());
        if(req.url()===APP)return route.fulfill({contentType:'text/html; charset=utf-8',body:html});
        if(url.origin!=='https://api.github.com')return route.abort();
        const m=url.pathname.match(/^\/repos\/([^/]+\/[^/]+)(.*)$/),remote=m&&repos[m[1]];
        const json=(status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
        if(!remote)return json(404,{});
        if(!m[2])return json(200,{private:true,full_name:m[1]});
        if(m[2]==='/contents/backup.json' && req.method()==='GET'){
          if(remote.data===null)return json(404,{});
          if((req.headers().accept||'').includes('raw'))return json(200,remote.data);
          return json(200,{sha:remote.sha,encoding:'base64',content:Buffer.from(JSON.stringify(remote.data)).toString('base64')});
        }
        if(m[2]==='/contents/backup.json' && req.method()==='PUT'){
          const body=req.postDataJSON();remote.attempts.push(body);
          if(remote.race){remote.data=clone(remote.race);remote.race=null;remote.sha=sha(++remote.n);}
          if(remote.data!==null && body.sha!==remote.sha)return json(409,{message:'sha mismatch'});
          remote.data=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
          remote.sha=sha(++remote.n);remote.puts.push(body);
          return json(200,{content:{sha:remote.sha}});
        }
        return json(404,{});
      });
      await p.goto(APP);return p;
    }
    const nvOf=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),NV);
    const aguardarConflito=async p=>{
      await p.locator('#nvConflito').waitFor({state:'visible'});
      const nv=await nvOf(p);assert.equal(nv.pendente,true);assert.equal(nv.conflito,true);
    };
    async function substituir(p){await p.click('#nvSubstituir');await p.click('#nvSubstituir');}

    // A edita um registro, exclui outro e acrescenta um treino; B ficou com a cópia velha.
    const original=estado([treino('editado',1),treino('excluido',2)]);
    const remote=makeRemote(original),repos={'teste/privado':remote};
    const a=await page(estado([treino('editado',1,20),treino('novo-a',3)]),config(sha(1)),repos);
    await a.waitForFunction(k=>!JSON.parse(localStorage.getItem(k)).pendente,NV);
    assert.equal(remote.puts.length,1);
    const salvoPorA=clone(remote.data),shaA=remote.sha;
    const b=await page(estado([...original.hist,treino('novo-b',4)]),config(sha(1)),repos);
    await aguardarConflito(b);
    assert.deepEqual(remote.data,salvoPorA,'Aparelho antigo não desfaz edição nem exclusão remota');
    assert.equal(remote.puts.length,1);
    await b.click('#nvRestaurar');
    await b.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).hist.some(h=>h.id==='novo-a'),LS);
    await aguardarConflito(b);
    assert.equal((await nvOf(b)).sha,sha(1),'Restaurar não aceita silenciosamente a versão divergente');
    assert.deepEqual(remote.data,salvoPorA);
    const [download]=await Promise.all([b.waitForEvent('download'),b.click('#nvBaixarRemoto')]);
    const baixado=JSON.parse(await fs.readFile(await download.path(),'utf8'));
    assert.deepEqual(baixado,salvoPorA,'É possível salvar a cópia remota antes de decidir');
    await substituir(b);
    await b.waitForFunction(k=>!JSON.parse(localStorage.getItem(k)).pendente,NV);
    const copia=await b.evaluate(k=>JSON.parse(localStorage.getItem(k)),COPIA);
    assert.equal(copia.repo,'teste/privado');assert.equal(copia.sha,shaA);assert.deepEqual(copia.data,salvoPorA);
    assert.equal(Object.hasOwn(copia,'token'),false);
    assert.equal(remote.puts.length,2);
    assert.equal((await nvOf(b)).sha,remote.sha);
    console.log('Dois aparelhos: edição/exclusão remota preservadas; restaurar mantém bloqueio; substituição explícita guarda cópia anterior.');

    // O remoto muda entre a leitura e a escrita: CAS no PUT continua protegendo os dados.
    const racing=makeRemote(original);racing.race=estado([treino('concorrente',6)]);
    const pr=await page(estado([...original.hist,treino('local-race',7)]),config(sha(1)),{'teste/privado':racing});
    await aguardarConflito(pr);
    assert.equal(racing.puts.length,0);assert.equal(racing.attempts.length,1);
    assert.equal(racing.data.hist[0].id,'concorrente');assert.equal((await nvOf(pr)).sha,sha(1));
    await pr.evaluate(()=>window.dispatchEvent(new Event('online')));
    assert.equal(racing.attempts.length,1,'Conflito não inicia tentativas automáticas destrutivas');

    // Configurações antigas sem SHA não podem adotar a versão atual antes de comparar/restaurar.
    const legacy=makeRemote(original);
    const pl=await page(estado([...original.hist,treino('legado-local',8)]),config(null),{'teste/privado':legacy});
    await aguardarConflito(pl);assert.equal(legacy.puts.length,0);
    await pl.locator('#nvConfig').evaluate(el=>el.open=true);
    await pl.fill('#nvToken','token-ficticio-novo');await pl.click('#nvLigar');
    await pl.waitForFunction(()=>document.querySelector('#nvLigar').disabled===false);
    await aguardarConflito(pl);assert.equal(legacy.puts.length,0,'Trocar chave não contorna a proteção do legado');

    // Sem espaço para resguardar a cópia anterior, a substituição não pode ocorrer.
    const protectedRemote=makeRemote(original,2);
    const pp=await page(estado([treino('local-sem-espaco',9)]),config(sha(1)),{'teste/privado':protectedRemote},{failCopy:true});
    await aguardarConflito(pp);await substituir(pp);
    await pp.waitForFunction(()=>!document.querySelector('#nvSubstituir').disabled);
    assert.equal(protectedRemote.attempts.length,0);assert.deepEqual(protectedRemote.data,original);
    assert.equal(await pp.evaluate(k=>localStorage.getItem(k),COPIA),null);
    assert.equal((await nvOf(pp)).sha,sha(1));

    // Trocar o repositório não deve levar o SHA da cópia anterior para o destino novo.
    const old=makeRemote(original),fresh={data:null,sha:null,n:0,puts:[],attempts:[],race:null};
    const pc=await page(original,config(sha(1),{pendente:false}),{'teste/privado':old,'teste/outro':fresh});
    await pc.locator('#nvConfig').evaluate(el=>el.open=true);
    await pc.fill('#nvRepo','teste/outro');await pc.fill('#nvToken','token-ficticio-outro');await pc.click('#nvLigar');
    await pc.waitForFunction(k=>{const n=JSON.parse(localStorage.getItem(k));return n.repo==='teste/outro'&&!n.pendente;},NV);
    assert.equal(fresh.puts.length,1);assert.equal(fresh.puts[0].sha,undefined);assert.deepEqual(old.data,original);
    assert.deepEqual(erros,[]);
    console.log('Conflito 409, legado sem SHA, troca de chave/repositório e falha ao resguardar cópia anterior verificados.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
