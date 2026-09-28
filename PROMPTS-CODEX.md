# Prompts para o Codex analisar o app de treino

## Como usar

1. Envie esta pasta para o Codex (o zip descompactado) **ou** conecte o repositório `DhepRX/treino-app` no Codex.
2. Cole o **Prompt 0** primeiro. Ele dá o contexto e as regras.
3. Depois cole **um prompt de análise por vez** (1 a 6). Cada um pede a resposta numa tabela.
4. Só use o **Prompt 7** (aplicar correções) depois de escolher quais itens quer corrigir.
5. Quer que o Claude confira? Traga a tabela ou o link do pull request para a conversa do Claude Code.

Regra de ouro: nas análises, o Codex **não altera arquivos**. Só lista o que achou.

---

## Prompt 0 — contexto (cole primeiro)

```
Você vai analisar um app web de treino de academia (PWA), usado num iPhone e instalado na Tela de Início.
Ele está publicado no GitHub Pages: https://dheprx.github.io/treino-app/

Antes de tudo, leia AGENTS.md (regras e mapa do código) e README.md.
O app inteiro está em index.html (HTML, CSS e JavaScript no mesmo arquivo, sem build e sem dependências), mais sw.js (service worker) e manifest.webmanifest.
A pasta testes/ tem roteiros de teste com Playwright; o testes/README.md explica como rodar.

Regras:
- Responda em português do Brasil.
- NÃO altere nenhum arquivo nesta etapa. Só analise e liste.
- Não proponha trocar de framework, adicionar build ou bibliotecas no app. Dependências de teste são permitidas somente fora do app.
- Não proponha mudar o formato dos dados salvos (localStorage "treino-renan-v1") nem os ids dos exercícios (a1…d6, e1…e5). A ficha 1 (W1) fica guardada para o histórico.

Diferencie problemas reproduzidos, suspeitas e limitações do ambiente. Use IDs únicos por análise: BUG-01, UX-01, OFF-01, DADOS-01, A11Y-01 e TESTE-01.
Para cada problema encontrado, use esta tabela:
| ID | Gravidade (alta/média/baixa) | Arquivo:linha | Problema | Como reproduzir | Correção sugerida |

Ordene do mais grave para o menos grave. Se não tiver certeza, escreva "a confirmar" e explique por quê.
No fim, liste o que você verificou e achou correto.
Responda só "Entendi" agora; as análises vêm nos próximos pedidos.
```

## Prompt 1 — bugs e lógica

```
Faça uma revisão de bugs e de lógica do index.html. Foque em:
- começar, marcar série, desmarcar, editar série, finalizar e descartar treino;
- peso e repetições que se copiam para as séries seguintes (segue, anterior);
- séries e cards que minimizam (setRowHTML, trocarSerie, exHTML, warmHTML, fecharDepois, abertos, fechados, seriesAbertas), incluindo "Minimizar todos" e o próximo exercício que abre sozinho;
- descanso e cronômetro da prancha (startRest, updateDock, paintRestRows, hold);
- sugestão de carga (suggest) e histórico (sanitize, compact, addEntry, finishSession);
- calendário, registrar e apagar treino, virada do dia (viraDia) e treino esquecido aberto (esquecido).
Procure: estados impossíveis, dados perdidos, toques que não fazem nada, contas erradas, datas e fuso (America/Sao_Paulo) e condições de corrida com setTimeout.
Use a tabela do Prompt 0.
```

## Prompt 2 — uso no iPhone, na academia

```
Analise a experiência de uso no iPhone (Safari e app da Tela de Início), com uma mão, entre as séries, com sinal fraco.
Declare o que foi observado em Chromium, WebKit ou iPhone real. Emulação de tela no Chromium não comprova o funcionamento no Safari ou na PWA instalada.
Considere os limites do iOS descritos no AGENTS.md (sem vibração, áudio só depois de um toque, dados separados entre Safari e ícone, app parado em segundo plano).
Aponte: botões com menos de 44 px, textos confusos, toques demais para registrar uma série, campos que o teclado cobre, rolagens que pulam e o que atrapalha usar entre as séries.
Sugira melhorias concretas, em ordem de impacto. Use a tabela do Prompt 0.
```

## Prompt 3 — offline, desempenho e atualização

```
Revise sw.js e o carregamento do index.html:
- O app abre sem internet depois da primeira visita? E com sinal fraco (a espera máxima é de 3 s)?
- Trocar VERSAO em sw.js atualiza o app no iPhone sem perder os treinos salvos?
- O que pesa ou trava: setInterval de 250 ms, redesenhos (renderAll), consultas repetidas ao DOM.
- A fonte do Google e os vídeos do YouTube quebram algo sem internet?
Use a tabela do Prompt 0.
```

## Prompt 4 — dados, backup e segurança

```
Revise dados e segurança:
- localStorage cheio, corrompido ou vazio: o que acontece? A SEED só entra na primeira abertura?
- Backup em arquivo e restauração (salvarBackup, juntarBackup): pode duplicar ou perder treinos?
- Backup automático no GitHub (nuvemEnviar, nuvemLigar, nuvemRestaurar): token guardado só no aparelho, repositório privado obrigatório, falha de rede, chave vencida e conflito de sha.
- XSS: todo texto que vem de backup ou do GitHub passa por sanitize() e esc() antes de ir para innerHTML?
Não sugira colocar token no código nem mandar dados para outro serviço. Use a tabela do Prompt 0.
```

## Prompt 5 — acessibilidade

```
Revise a acessibilidade para VoiceOver e para quem enxerga pouco:
- rótulos (aria-label) dos botões de série, do ✓, de "editar", "Abrir", "Minimizar" e "Minimizar todos";
- anúncios (aria-live) do descanso e das séries;
- contraste (o app usa sempre o tema claro);
- para onde vai o foco depois de minimizar ou abrir um card;
- tamanho das áreas de toque.
Use a tabela do Prompt 0.
```

## Prompt 6 — testes

```
Leia testes/README.md e rode node testes/rodar.js. Informe ambiente, versões, asserções, código de saída e saída de cada roteiro. Diferencie execução concluída de comportamento validado; não declare sucesso com base apenas em console.log. Pode gerar prints e instalar dependências de teste, sem alterar o código do app.
Depois proponha, sem aplicar, os testes que faltam para as partes de maior risco do app.
```

## Prompt 7 — aplicar correções (só depois de escolher)

```
Aplique apenas os itens [coloque aqui os IDs únicos] da sua lista.
Regras:
- mantenha o app num único index.html, sem bibliotecas;
- não mude o formato dos dados salvos nem os ids dos exercícios;
- troque o número da VERSAO em sw.js;
- textos da tela em português do Brasil, curtos e diretos.
Depois rode node testes/rodar.js e mostre a saída. Acrescente testes de regressão para os itens corrigidos.
Se estiver conectado ao GitHub, abra um pull request em DhepRX/treino-app, sem fazer merge.
Me entregue o diff e um resumo do que mudou em cada item.
```

---

## Depois

- **Codex conectado ao GitHub:** peça o pull request (Prompt 7) e mande o link para o Claude Code. Ele confere, testa e faz o merge.
- **Codex devolveu arquivos:** mande os arquivos para o Claude Code, que confere e publica.
- Não publique duas versões ao mesmo tempo (uma pelo Codex e outra pelo Claude), para não se sobrescreverem.
