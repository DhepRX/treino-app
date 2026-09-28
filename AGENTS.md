# Treino do Renan — contexto para agentes (Codex, Claude)

App de treino (A, B, C e D) para iPhone, instalado na Tela de Início como PWA.
Desde 28/09/2026 vale a **ficha 2**: A e C superiores, B e D pernas e tronco, sem carga direta na coluna.
Publicado no GitHub Pages: **https://dheprx.github.io/treino-app/** (repositório `DhepRX/treino-app`, branch `main`, pasta raiz).
O dono usa o app na academia, pelo celular. Textos da interface em **português do Brasil**, curtos e diretos.

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| `index.html` | O app inteiro: HTML, CSS e JavaScript no mesmo arquivo, sem build e sem dependências |
| `sw.js` | Service worker: guarda o app para abrir sem internet |
| `manifest.webmanifest` | Nome, cores e ícones para instalar |
| `icon-180.png`, `icon-192.png`, `icon-512.png` | Ícones (halter amarelo no fundo preto), gerados de `icone.svg`. Ao trocar o desenho, suba o `?v=` nos links do `index.html`, do `manifest.webmanifest` e do `sw.js` |
| `icone.svg` | Desenho do ícone, 512 × 512, sem transparência (o iPhone arredonda os cantos) |
| `README.md` | Instruções para o dono (publicar, instalar, backup) |
| `AGENTS.md` | Este arquivo |
| `.nojekyll` | Faz o GitHub Pages publicar os arquivos como estão |

## Regras que não podem quebrar

1. **Caminhos relativos** (`./sw.js`, `icon-192.png`). O site roda na subpasta `/treino-app/`.
2. **Ao publicar qualquer mudança, troque `VERSAO` em `sw.js`** (hoje `treino-renan-v20`) para o celular pegar a versão nova.
3. **Não mude o formato dos dados salvos sem migração.** Os treinos ficam só no celular (`localStorage`); perder o formato é perder o histórico.
4. **Não renomeie os `id` dos exercícios** (`a1`…`d6`, `e1`…`e5`): eles são as chaves do histórico e da sugestão de carga. Para trocar um exercício, mude `nome`, `maq`, `como` etc. e mantenha o `id`. Movimento novo ou com carga que não dá para comparar (máquina → halteres) ganha id novo (próximo: `e6`). O que sai dos treinos continua em `X2` (ou em `W1`), porque `CONHECIDOS` e o histórico dependem dele: `e1` (remada na máquina) saiu em 28/09/2026 e foi trocada pela `e5`.
5. Sem bibliotecas externas além da fonte Archivo do Google Fonts. Sem framework nem dependências npm no app. Playwright é permitido somente para testes; veja `testes/README.md`.
6. Tudo precisa funcionar offline, menos os vídeos e o backup no GitHub.
7. **Não apague a ficha 1** (`W1`): o histórico antigo usa os nomes dela. Treino salvo sem o campo `ficha` é da ficha 1.
8. **Tema sempre claro**, mesmo com o iPhone no modo escuro: foi o estilo que o dono escolheu. Não volte o `prefers-color-scheme: dark`.

## Dados (localStorage)

- `treino-renan-v1`: estado principal `{ v:1, cur, hist, upd }`
  - `cur`: treino em andamento `{ wid, start, sets:{ [exId]: [{kg, reps, done}] }, warm }` ou `null`
  - `cur` também tem `ficha` (1 ou 2); sem o campo, é da ficha 1 e continua sendo mostrado com a ficha 1 até finalizar.
  - `hist`: treinos feitos `[{ id, wid, ficha?, start, end, sets, manual?, n?, rot?, fonte? }]`; `wid` é `A`–`D` ou `X` (outro treino); `ficha` ausente = ficha 1
  - Treino marcado à mão no calendário ganha a ficha atual se for hoje, ou a que valia na data (`fichaDoDia()`; a ficha 2 começa em 28/09/2026).
  - Tudo que entra passa por `sanitize()`. Ao ler, o app chama `sanitize(JSON.parse(...))`.
  - Na primeira abertura, carrega `SEED` (treinos até 26/09/2026).
- `treino-renan-backup`: data (ms) do último backup, manual ou automático.
- `treino-renan-curta`: versão curta do treino em andamento `{ start, tronco }` (fica fora dos dados do treino).
- `treino-renan-nuvem`: backup automático `{ repo, token, pendente, ultimo, erro }`. Grava `backup.json` num repositório **privado** via GitHub Contents API (`PUT /repos/{repo}/contents/backup.json`), com uma chave fine-grained. O token fica só no aparelho; nunca coloque token no código.
  `pendente` só vira `false` quando o GitHub confirma o envio. Ao configurar num celular com `backup.json` já no GitHub, o app junta o histórico de lá e só envia se este celular tiver treinos que o GitHub não tem.

## Onde mexer no `index.html`

- **Fichas:** `W1` (ficha 1, até 27/09/2026, completa) e `W2` + `X2` (ficha 2). `X2` guarda cada exercício da ficha 2 uma vez;
  `W2` lista os treinos como `[id, séries]`, porque o mesmo exercício aparece em mais de um treino com séries diferentes.
  `montar()` cria `FICHAS`; `ATUAL = 2`. Use `treinoDe(ficha, letra)`, `treinoTela(letra)` (o treino em andamento na ficha em que começou) e `exTela(id)`.
  Cada exercício tem `e.w` (letra) e `e.f` (ficha). Não existe mais `EX` global.
- **Campos de exercício:** `id, vid (YouTube), nome, maq, s (séries), r:[mín,máx], rest (s), kg (carga inicial), inc (quanto subir), yt (busca no YouTube), como[], erros, troca`
  e, quando precisar: `lado`, `perna`, `braco` (meta "cada lado/perna/braço"), `tempo` (segundos, com cronômetro), `semPeso` (só repetições), `extra` (texto na meta),
  `pernas` (regra de subir carga das pernas), `tronco` (entra na versão curta se ele quiser), `par` e `parCurto` (emendado sem descanso; só na ficha 1).
- **Vídeos (`vid`):** todo exercício tem um. Os de `a5`, `b6` e `e1`…`e5` foram escolhidos pelo título na busca do YouTube, sem conferir pelo oEmbed (o ambiente de teste bloqueia o YouTube). Se um não abrir no app, troque o `vid`.
- **Séries que valem hoje:** `S(e)`. Na **adaptação** (`adaptacao()` e `faltamAdaptacao()`: até fazer A, B, C e D uma vez na ficha 2) e na **versão curta** (`curtaAtiva()`, `exibidos()`), no máximo 2.
- **Sugestão de carga:** `suggest()` sobe `inc` quando todas as séries feitas (pelo menos 2) bateram o topo da faixa. Com `pernas`, só depois de 2 treinos seguidos no topo, com a mesma carga (`sessoes()`, `bateuTopo()`).
- **Avisos da ficha 2:** `avisosHTML()` (adaptação ou esforço, cargas antigas de perna, segurança).
- **Aquecimento por exercício:** cada treino de `W2` tem `aquece` (ids que ganham 1 série leve antes, porque o movimento muda bastante). `warmHTML()` lista esses exercícios com número e nome; `aqueceHTML()` põe o aviso no card (o 1º exercício: 2 a 3 séries leves). Essas séries não contam.
- **Séries do treino em andamento:** `curSet()` só devolve séries quando o treino em andamento é o da tela (os ids se repetem entre os treinos da ficha 2).
- **Peso e repetições digitados uma vez:** `segue()` copia o valor para as séries seguintes; `anterior()` repete o valor da série anterior ao marcar.
- **Séries e cards minimizados:** `setRowHTML()` desenha uma série (feita vira linha "18 kg × 8 · editar"); `trocarSerie()` redesenha só ela.
  `exHTML()` / `warmHTML()` viram uma linha quando o exercício/aquecimento está completo; `fecharDepois()` minimiza e rola para o próximo;
  `abertos` (completos abertos na mão), `fechados` (minimizados antes de terminar, via "Minimizar todos" ou "Minimizar") e `seriesAbertas` ficam só em memória;
  ao terminar um exercício, o próximo por fazer que estava em `fechados` abre sozinho.
- **Um treino por dia** (pedido do dono): `treinoHoje()` acha o treino salvo hoje. Sem treino em andamento, a aba dele mostra `concluidoHTML()` e as outras `jaTreinouHTML()`; todas ficam travadas (`travado()`) até o dia seguinte. `reabrir()` volta o treino salvo para `cur` (cópia das séries); ao finalizar, `addEntry()` substitui o salvo pelo mesmo `id`, e descartar não apaga o salvo. No calendário, dia com treino (`diaOcupado()`) não mostra "Registrar treino"; dias antigos com dois treinos mostram um aviso para apagar o que sobrou.
- **Treino esquecido aberto:** `esquecido()` (mais de 5 h); ao finalizar, salva com a duração `min` do treino.
- **Descanso, apito e tela acesa:** `startRest()`, `beep()`, `somOn()` (libera o áudio no iPhone a cada toque), `wake()`.
- **Virada do dia:** `viraDia()`. O iPhone deixa o app parado em segundo plano; ao voltar noutro dia, redesenha.
- **Backup:** `salvarBackup()` (arquivo), `juntarBackup()` (restaura sem apagar nada), `nuvemEnviar()` / `nuvemLigar()` / `nuvemRestaurar()` (GitHub).
- `connect()` / `window.claude`: sincronização que só funciona dentro do Claude. Fora dele, não faz nada. Mantenha.

## Limites do iPhone (não tente contornar)

- Sites não vibram; o fim do descanso só apita com o app aberto e o celular fora do silencioso.
- Site não salva arquivo sozinho: backup em arquivo sempre precisa de um toque (por isso existe o backup no GitHub).
- O app da Tela de Início e o Safari guardam dados separados.
- O ícone só muda quando o app é adicionado de novo à Tela de Início, e apagar o app de lá apaga os dados dele: backup antes, restaurar depois (passo a passo no `README.md`).

## Como testar

Rode `node testes/rodar.js` após preparar o Playwright conforme `testes/README.md`. O comando inicia e encerra o servidor e executa os onze roteiros sequencialmente, também no PowerShell. Os testes devem falhar com saída diferente de zero quando uma asserção falhar. Chromium com tela de iPhone não substitui validação no Safari e na PWA instalada.

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
