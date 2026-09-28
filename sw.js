// Guarda o app no celular para abrir sem internet.
// Ao publicar uma versão nova, troque o número da VERSAO.
const VERSAO = 'treino-renan-v15';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icon-180.png?v=2', './icon-192.png?v=2', './icon-512.png?v=2'];
// Com sinal fraco (academia), espera a internet no máximo isso antes de abrir a cópia guardada.
const ESPERA_MS = 3000;

self.addEventListener('install', event => {
  // cache:'reload' pula o cache do navegador, para guardar sempre a versão recém-publicada.
  event.waitUntil(
    caches.open(VERSAO)
      .then(cache => cache.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Busca na internet e guarda uma cópia, sem atrasar a resposta.
function buscar(event, req, chave, pode) {
  const rede = fetch(req).then(resp => {
    if (pode(resp)) {
      const copia = resp.clone();
      event.waitUntil(caches.open(VERSAO).then(cache => cache.put(chave, copia)));
    }
    return resp;
  });
  event.waitUntil(rede.catch(() => {}));
  return rede;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // A página do app: tenta a internet primeiro, para receber as atualizações.
  // Sem sinal, com erro ou demorando mais de ESPERA_MS, abre a cópia guardada.
  if (req.mode === 'navigate') {
    // Outras páginas publicadas na mesma pasta (README.md, testes) passam direto:
    // não podem virar a cópia guardada do app.
    const pasta = new URL(self.registration.scope).pathname;
    if (url.origin !== self.location.origin || (url.pathname !== pasta && url.pathname !== pasta + 'index.html')) return;
    const rede = buscar(event, req, './index.html', r => r.ok && !r.redirected);
    const guardada = () => caches.match('./index.html').then(r => r || caches.match('./'));
    // Redirecionamento (endereço novo do site) vai para o navegador seguir.
    const direto = r => r.ok || r.type === 'opaqueredirect' || (r.status >= 300 && r.status < 400);
    event.respondWith(new Promise(responder => {
      let pronto = false;
      const usar = r => { if (r && !pronto) { pronto = true; responder(r); } };
      const espera = setTimeout(() => guardada().then(usar), ESPERA_MS);
      rede.then(
        r => { clearTimeout(espera); if (direto(r)) usar(r); else guardada().then(g => usar(g || r)); },
        () => { clearTimeout(espera); guardada().then(g => usar(g || Response.error())); }
      );
    }));
    return;
  }

  // Arquivos do próprio app e a fonte do Google: usa a cópia guardada e atualiza por trás.
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === self.location.origin || fonte) {
    const rede = buscar(event, req, req, r => r.ok || r.type === 'opaque');
    event.respondWith(caches.match(req).then(guardado => guardado || rede));
  }
  // O resto (os vídeos do YouTube) passa direto pela internet.
});
