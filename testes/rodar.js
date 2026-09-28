// Um comando para Windows, macOS e Linux; os cenários de lentidão são sequenciais.
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
const testes = ['ficha2','correcoes','serie','peso','mini','todos','revisao','nuvem','armazenamento','geral','sinal-fraco'];
const BASE = 'http://127.0.0.1:8766';
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));
// O servidor fecha conexões paradas; o fetch do Node às vezes reaproveita uma já fechada
// ("other side closed"). Tenta de novo em vez de derrubar a suíte.
async function pedir(caminho, tentativas = 4){
  for (let i = 1; ; i++) {
    try { return await fetch(BASE + caminho, { signal:AbortSignal.timeout(2000) }); }
    catch (e) { if (i >= tentativas) throw e; await pausa(200); }
  }
}
(async () => {
  // Não reutiliza nem encerra um servidor que pertença a outra sessão.
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(new Error('Porta 8766 ocupada. Encerre seu servidor antes de rodar a suíte.')));
    probe.listen(8766, '127.0.0.1', () => probe.close(resolve));
  });
  const servidor = spawn(process.execPath, [path.join(__dirname, 'servidor.js')], { stdio:'inherit', windowsHide:true });
  let pronto = false;
  try {
    for (let i = 0; i < 50; i++) {
      if (servidor.exitCode !== null) throw new Error('Servidor encerrou durante a inicialização.');
      try { pronto = (await pedir('/treino-app/', 1)).ok; } catch {}
      if (pronto) break;
      await pausa(100);
    }
    if (!pronto) throw new Error('Servidor não iniciou.');
    const falhas = [];
    for (const nome of testes) {
      console.log('\n### teste-' + nome);
      await pedir('/__normal');
      const resultado = spawnSync(process.execPath, [path.join(__dirname, 'teste-' + nome + '.js')], { stdio:'inherit', timeout:120000, windowsHide:true });
      if (resultado.status !== 0 || resultado.error) falhas.push(nome);
    }
    if (falhas.length) throw new Error('Falharam: ' + falhas.join(', '));
    console.log('\nOK: ' + testes.length + ' roteiros concluídos com asserções.');
  } finally { servidor.kill(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
