// Guarda o app no celular para abrir sem internet.
// Ao publicar uma versão nova, troque o número da VERSAO.
const VERSAO = 'treino-renan-v3';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSAO).then(cache => cache.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // A página: tenta a internet primeiro, para receber as atualizações, e usa a cópia guardada quando está sem sinal.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(VERSAO).then(cache => cache.put('./index.html', copia));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Arquivos do próprio app e a fonte do Google: usa a cópia guardada e atualiza por trás.
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === self.location.origin || fonte) {
    event.respondWith(
      caches.match(req).then(guardado => {
        const daRede = fetch(req)
          .then(resp => {
            if (resp.ok || resp.type === 'opaque') {
              const copia = resp.clone();
              caches.open(VERSAO).then(cache => cache.put(req, copia));
            }
            return resp;
          })
          .catch(() => guardado || Response.error());
        return guardado || daRede;
      })
    );
  }
  // O resto (os vídeos do YouTube) passa direto pela internet.
});
