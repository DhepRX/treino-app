const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const URL_APP = 'http://127.0.0.1:8766/treino-app/';
const ORIGEM_VIDEO = 'https://www.youtube-nocookie.com';

(async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers:'block', timezoneId:'America/Sao_Paulo' });
    await ctx.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      let offset = 0;
      Date.now = () => realNow() + offset;
      window.avancarRelogio = ms => { offset += ms; };
      window.audioTeste = { criados:0, resumes:0, fechados:0, osciladores:0, ativos:0 };
      class AudioFalso {
        constructor() {
          this.state = 'suspended'; this.currentTime = 0; this.destination = {};
          window.audioTeste.criados++; window.audioTeste.ativos++;
        }
        resume() { this.state = 'running'; window.audioTeste.resumes++; return Promise.resolve(); }
        suspend() { this.state = 'suspended'; return Promise.resolve(); }
        close() {
          if (this.state !== 'closed') { window.audioTeste.fechados++; window.audioTeste.ativos--; this.state = 'closed'; }
          return Promise.resolve();
        }
        createBuffer() { return {}; }
        createBufferSource() { return { connect(){}, disconnect(){}, start(){}, stop(){} }; }
        createOscillator() {
          window.audioTeste.osciladores++;
          return { frequency:{ value:0 }, connect(){}, disconnect(){}, start(){}, stop(){ if (this.onended) setTimeout(() => this.onended(), 0); } };
        }
        createGain() { return { connect(){}, disconnect(){}, gain:{ setValueAtTime(){}, exponentialRampToValueAtTime(){} } }; }
      }
      window.AudioContext = AudioFalso;
      window.webkitAudioContext = AudioFalso;
    });
    // Player fictício com a origem real do iframe, sem carregar o YouTube.
    await ctx.route('https://www.youtube-nocookie.com/embed/**', route => route.fulfill({
      contentType:'text/html',
      body:'<!doctype html><title>Player simulado</title><p>Vídeo simulado</p><script>window.comandos=[];addEventListener("message",e=>{try{comandos.push(JSON.parse(e.data))}catch{}});setTimeout(()=>{window.pronto=true;parent.postMessage(JSON.stringify({event:"onReady"}),"*")},900);<\/script>'
    }));
    const p = await ctx.newPage(), erros = [];
    p.on('pageerror', e => erros.push(e.message));
    await p.goto(URL_APP);
    await p.evaluate(() => {
      localStorage.clear();
      const hist = ['A','B','C','D'].map((wid,i) => ({ id:'ciclo-'+wid, wid, ficha:2, manual:true, start:Date.UTC(2026,8,20+i,12), end:Date.UTC(2026,8,20+i,12), sets:{} }));
      localStorage.setItem('treino-renan-v1',JSON.stringify({v:1,cur:null,hist,upd:0}));
    });
    await p.reload();
    const metricas = () => p.evaluate(() => ({...window.audioTeste}));
    const descartar = async () => {
      await p.click('#workout > .finish [data-act="discard"]');
      await p.click('#workout > .finish [data-act="discard"]');
    };
    const ocultar = () => p.evaluate(() => {
      Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const mostrar = () => p.evaluate(() => {
      delete document.visibilityState;
      document.dispatchEvent(new Event('visibilitychange'));
    });

    assert.equal(await p.getAttribute('#somAvisos','aria-pressed'),'false');
    await p.click('[data-tab="A"]');
    await p.click('.setrow[data-ex="a1"][data-i="0"] [data-done]');
    assert.equal((await metricas()).criados,0,'Marcar série e contar descanso não deve criar áudio por padrão');
    await p.evaluate(() => window.avancarRelogio(200000));
    await p.waitForTimeout(400);
    assert.match(await p.textContent('#dockLabel'),/próxima série/i,'Fim do descanso continua visível');
    assert.equal((await metricas()).criados,0,'Fim do descanso silencioso não toma sessão de áudio');
    await descartar();
    await p.click('[data-tab="D"]');
    await p.click('[data-act="start"]');
    await p.click('.setrow[data-ex="d6"][data-i="0"] [data-hold]');
    await p.evaluate(() => window.avancarRelogio(45000));
    await p.waitForTimeout(400);
    assert.equal((await metricas()).criados,0,'Cronômetro da prancha também permanece silencioso');
    await descartar();

    // Som é opcional; desligar e ocultar a página liberam o contexto.
    await p.click('#somAvisos');
    assert.equal(await p.getAttribute('#somAvisos','aria-pressed'),'true');
    assert.equal(await p.evaluate(() => localStorage.getItem('treino-renan-som')),'1');
    await p.click('[data-tab="A"]');
    await p.click('.setrow[data-ex="a1"][data-i="0"] [data-done]');
    assert.ok((await metricas()).criados>0,'Opt-in permite preparar o aviso sonoro');
    await p.click('[data-rest="skip"]');
    assert.equal((await metricas()).ativos,0,'Pular descanso libera o áudio');
    await p.click('[data-rs="a1:1"]');
    await p.click('[data-rs="a1:1"]');
    assert.equal((await metricas()).ativos,0,'Cancelar descanso na série também libera o áudio');
    await p.click('[data-rs="a1:2"]');
    await p.click('#somAvisos');
    assert.equal((await metricas()).ativos,0,'Desligar libera todo contexto de áudio');
    await p.click('#somAvisos');
    await p.click('[data-rs="a1:1"]');
    await ocultar();
    assert.equal((await metricas()).ativos,0,'Segundo plano libera áudio');
    await mostrar();
    await p.click('[data-rs="a1:2"]');
    const osciladoresAntes = (await metricas()).osciladores;
    await p.evaluate(() => window.avancarRelogio(200000));
    await p.waitForTimeout(1100);
    assert.ok((await metricas()).osciladores>osciladoresAntes,'Aviso habilitado toca quando termina o descanso');
    assert.equal((await metricas()).ativos,0,'Contexto fecha após o apito');
    await p.reload();
    assert.equal(await p.getAttribute('#somAvisos','aria-pressed'),'true','Preferência de som persiste');
    await p.click('#somAvisos');
    await descartar();

    // Usamos mensagens da janela do iframe para testar origem e remetente.
    await p.click('[data-tab="A"]');
    async function abrir(id='a1') {
      await p.click('[data-video="'+id+'"]');
      const iframe = p.locator('[data-video-box="'+id+'"] iframe');
      await iframe.waitFor();
      const src = new URL(await iframe.getAttribute('src'));
      assert.equal(src.origin,ORIGEM_VIDEO);
      assert.equal(src.searchParams.get('mute'),'1');
      assert.equal(src.searchParams.get('enablejsapi'),'1');
      assert.equal(src.searchParams.get('origin'),new URL(URL_APP).origin);
      const frame = await (await iframe.elementHandle()).contentFrame();
      await frame.waitForLoadState('domcontentloaded');
      await frame.waitForFunction(() => comandos.some(c => c.func === 'mute') && comandos.some(c => c.func === 'addEventListener' && c.args[0] === 'onStateChange'));
      return frame;
    }
    const estado = (frame, info) => frame.evaluate(info => parent.postMessage(JSON.stringify({event:'onStateChange',info}),'*'),info);
    const fechado = () => p.waitForFunction(() => !document.querySelector('[data-video-box] iframe'));
    let frame = await abrir();
    await frame.waitForFunction(() => window.pronto && comandos.filter(c => c.event === 'listening').length >= 2);
    const pedidos = await frame.evaluate(() => comandos.filter(c => c.event === 'listening').length);
    await p.waitForTimeout(650);
    assert.equal(await frame.evaluate(() => comandos.filter(c => c.event === 'listening').length),pedidos,'Para de tentar conectar quando o player confirma que está pronto');
    await estado(frame,2); await p.waitForTimeout(100);
    assert.equal(await p.locator('[data-video-box] iframe').count(),1,'Pausa inicial não fecha o player antes de assistir');
    await p.evaluate(() => {
      const iframe = document.querySelector('[data-video-box] iframe');
      dispatchEvent(new MessageEvent('message',{origin:'https://example.com',source:iframe.contentWindow,data:JSON.stringify({event:'onStateChange',info:0})}));
      dispatchEvent(new MessageEvent('message',{origin:'https://www.youtube-nocookie.com',source:window,data:JSON.stringify({event:'onStateChange',info:0})}));
    });
    assert.equal(await p.locator('[data-video-box] iframe').count(),1,'Mensagens com origem ou remetente incorretos são ignoradas');
    await estado(frame,1); await estado(frame,2); await fechado();
    frame = await abrir();
    await estado(frame,0); await fechado();
    frame = await abrir();
    await p.click('[data-video="a1"]');
    await fechado();
    frame = await abrir();
    await abrir('b1');
    assert.equal(await p.locator('[data-video-box] iframe').count(),1,'Só um vídeo fica aberto');
    assert.equal(await p.locator('[data-video-box="a1"] iframe').count(),0);
    await ocultar(); await fechado(); await mostrar();
    frame = await abrir();
    await p.evaluate(() => dispatchEvent(new Event('pagehide')));
    await fechado();
    frame = await abrir();
    await p.click('.setrow[data-ex="a1"][data-i="0"] [data-done]');
    await fechado();
    await descartar();
    await p.click('[data-tab="D"]'); await p.click('[data-act="start"]');
    await abrir('d6');
    await p.click('.setrow[data-ex="d6"][data-i="0"] [data-hold]');
    await fechado();
    assert.equal((await metricas()).criados,0,'Som desligado permanece sem criar áudio após recarga e vídeos');
    assert.deepEqual(erros,[]);
    console.log('OK: descanso/prancha silenciosos, opção de som, fechamento de áudio e liberação dos vídeos simulados.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
