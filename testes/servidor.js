// Serve o app em /treino-app/, como o GitHub Pages. /__lento liga a demora de 15 s na página, /__normal desliga.
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const TIPOS = { '.html':'text/html; charset=utf-8', '.js':'application/javascript', '.webmanifest':'application/manifest+json', '.png':'image/png', '.md':'text/markdown' };
let lento = false;
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__lento') { lento = true; return res.end('lento'); }
  if (u.pathname === '/__normal') { lento = false; return res.end('normal'); }
  if (!u.pathname.startsWith('/treino-app/')) { res.statusCode = 404; return res.end(); }
  let rel = u.pathname.slice('/treino-app/'.length) || 'index.html';
  const arq = path.join(RAIZ, rel);
  fs.readFile(arq, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('404'); }
    const enviar = () => { res.setHeader('Content-Type', TIPOS[path.extname(arq)] || 'application/octet-stream'); res.setHeader('Cache-Control', path.extname(arq) === '.html' ? 'no-cache' : 'max-age=600'); res.end(data); };
    if (lento && rel === 'index.html') setTimeout(enviar, 15000); else enviar();
  });
}).listen(8766, '127.0.0.1');
