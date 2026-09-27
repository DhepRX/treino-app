# Treino do Renan — contexto para agentes (Codex, Claude)

App de treino (A, B, C e D) para iPhone, instalado na Tela de Início como PWA.
Publicado no GitHub Pages: **https://dheprx.github.io/treino-app/** (repositório `DhepRX/treino-app`, branch `main`, pasta raiz).
O dono usa o app na academia, pelo celular. Textos da interface em **português do Brasil**, curtos e diretos.

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| `index.html` | O app inteiro: HTML, CSS e JavaScript no mesmo arquivo, sem build e sem dependências |
| `sw.js` | Service worker: guarda o app para abrir sem internet |
| `manifest.webmanifest` | Nome, cores e ícones para instalar |
| `icon-180.png`, `icon-192.png`, `icon-512.png` | Ícones |
| `README.md` | Instruções para o dono (publicar, instalar, backup) |
| `AGENTS.md` | Este arquivo |
| `.nojekyll` | Faz o GitHub Pages publicar os arquivos como estão |

## Regras que não podem quebrar

1. **Caminhos relativos** (`./sw.js`, `icon-192.png`). O site roda na subpasta `/treino-app/`.
2. **Ao publicar qualquer mudança, troque `VERSAO` em `sw.js`** (hoje `treino-renan-v11`) para o celular pegar a versão nova.
3. **Não mude o formato dos dados salvos sem migração.** Os treinos ficam só no celular (`localStorage`); perder o formato é perder o histórico.
4. **Não renomeie os `id` dos exercícios** (`a1`…`d6`): eles são as chaves do histórico e da sugestão de carga. Para trocar um exercício, mude `nome`, `maq`, `como` etc. e mantenha o `id`.
5. Sem bibliotecas externas além da fonte Archivo do Google Fonts. Sem framework nem dependências npm no app. Playwright é permitido somente para testes; veja `testes/README.md`.
6. Tudo precisa funcionar offline, menos os vídeos e o backup no GitHub.

## Dados (localStorage)

- `treino-renan-v1`: estado principal `{ v:1, cur, hist, upd }`
  - `cur`: treino em andamento `{ wid, start, sets:{ [exId]: [{kg, reps, done}] }, warm }` ou `null`
  - `hist`: treinos feitos `[{ id, wid, start, end, sets, manual?, n?, rot?, fonte? }]`; `wid` é `A`–`D` ou `X` (outro treino)
  - Tudo que entra passa por `sanitize()`. Ao ler, o app chama `sanitize(JSON.parse(...))`.
  - Na primeira abertura, carrega `SEED` (treinos até 26/09/2026).
- `treino-renan-backup`: data (ms) do último backup, manual ou automático.
- `treino-renan-nuvem`: backup automático `{ repo, token, pendente, ultimo, erro }`. Grava `backup.json` num repositório **privado** via GitHub Contents API (`PUT /repos/{repo}/contents/backup.json`), com uma chave fine-grained. O token fica só no aparelho; nunca coloque token no código.

## Onde mexer no `index.html`

- **Treinos e exercícios:** array `W` (perto da linha 330). Campos de cada exercício:
  `id, vid (YouTube), nome, maq, s (séries), r:[mín,máx], rest (s), kg (carga inicial), inc (quanto subir), yt (busca no YouTube), como[], erros, troca`
  e, quando precisar: `lado`, `perna`, `braco` (meta "cada lado/perna/braço"), `tempo` (segundos, com cronômetro), `par` e `parCurto` (exercício emendado sem descanso).
- **Sugestão de carga:** `suggest()` sobe `inc` quando todas as séries bateram o máximo de repetições.
- **Peso e repetições digitados uma vez:** `segue()` copia o valor para as séries seguintes; `anterior()` repete o valor da série anterior ao marcar.
- **Séries e cards minimizados:** `setRowHTML()` desenha uma série (feita vira linha "18 kg × 8 · editar"); `trocarSerie()` redesenha só ela.
  `exHTML()` / `warmHTML()` viram uma linha quando o exercício/aquecimento está completo; `fecharDepois()` minimiza e rola para o próximo;
  `abertos` (completos abertos na mão), `fechados` (minimizados antes de terminar, via "Minimizar todos" ou "Minimizar") e `seriesAbertas` ficam só em memória;
  ao terminar um exercício, o próximo por fazer que estava em `fechados` abre sozinho.
- **Treino esquecido aberto:** `esquecido()` (mais de 5 h); ao finalizar, salva com a duração `min` do treino.
- **Descanso, apito e tela acesa:** `startRest()`, `beep()`, `somOn()` (libera o áudio no iPhone a cada toque), `wake()`.
- **Virada do dia:** `viraDia()`. O iPhone deixa o app parado em segundo plano; ao voltar noutro dia, redesenha.
- **Backup:** `salvarBackup()` (arquivo), `juntarBackup()` (restaura sem apagar nada), `nuvemEnviar()` / `nuvemLigar()` / `nuvemRestaurar()` (GitHub).
- `connect()` / `window.claude`: sincronização que só funciona dentro do Claude. Fora dele, não faz nada. Mantenha.

## Limites do iPhone (não tente contornar)

- Sites não vibram; o fim do descanso só apita com o app aberto e o celular fora do silencioso.
- Site não salva arquivo sozinho: backup em arquivo sempre precisa de um toque (por isso existe o backup no GitHub).
- O app da Tela de Início e o Safari guardam dados separados.

## Como testar

Rode `node testes/rodar.js` após preparar o Playwright conforme `testes/README.md`. O comando inicia e encerra o servidor e executa os nove roteiros sequencialmente, também no PowerShell. Os testes devem falhar com saída diferente de zero quando uma asserção falhar. Chromium com tela de iPhone não substitui validação no Safari e na PWA instalada.

Alternativa manual para Bash:

```bash
mkdir -p /tmp/site && ln -s "$PWD" /tmp/site/treino-app
cd /tmp/site && python3 -m http.server 8000
# abra http://localhost:8000/treino-app/ num navegador com tela de celular (390 x 844)
```

Confira no mínimo: começar um treino, marcar série (descanso aparece embaixo), finalizar (dois toques), calendário, salvar e restaurar backup, e abrir sem internet depois da primeira visita.
Antes de publicar, rode a checagem de sintaxe dos scripts:

```bash
node -e "const h=require('fs').readFileSync('index.html','utf8');[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m=>new Function(m[1]));console.log('ok')"
```

## Como publicar

Mudança em branch → pull request → merge na `main`. O GitHub Pages atualiza em cerca de 1 minuto.
No iPhone, fechar o app e abrir de novo com internet.
