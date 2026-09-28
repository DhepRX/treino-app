# Roteiros de teste

Abrem o app num Chromium com tela de iPhone 13 e fazem o que você faria na academia.
Os roteiros verificam comportamentos críticos com `node:assert/strict`; divergências e erros de JavaScript fazem o processo falhar. Logs adicionais ainda servem para inspeção e não equivalem a cobertura completa.

Chromium com tela de iPhone não executa Safari/iOS. Confira também teclado, áudio, instalação e retorno do segundo plano em um iPhone real.

## Preparar (uma vez)

Precisa de Node 22 ou mais novo e npm. Playwright é dependência exclusiva dos testes, não do app.

```bash
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
```

## Rodar

Na pasta do app (a que tem o `index.html`):

```bash
node testes/rodar.js
```

O mesmo comando funciona no PowerShell, Bash e terminal do macOS. Ele inicia o servidor em `http://127.0.0.1:8766/treino-app/`, executa os onze roteiros em sequência e encerra o servidor. Se a porta estiver ocupada, avisa em vez de usar outro servidor. Não rode testes de rede em paralelo.

Para um roteiro isolado: abra um terminal com `node testes/servidor.js`; em outro, rode por exemplo `node testes/teste-nuvem.js`. Encerre o servidor com Ctrl+C.

Os prints ficam em `testes/prints/`.

## O que cada um testa

| Roteiro | O que testa |
| --- | --- |
| `teste-ficha2.js` | Ficha 2: próximo treino, adaptação com 2 séries, cargas sugeridas, nomes da ficha 1 no calendário, regra das pernas, versão curta, backup antigo e treino da ficha 1 aberto |
| `teste-correcoes.js` | Correções da revisão de 28/09/2026: aquecimento no primeiro toque, séries do mesmo exercício em dois treinos, editar e trocar de aba, versão curta (progresso e número do card), "Minimizar todos" que não passa para o próximo treino, treino marcado à mão num dia da ficha 1, aviso de falha ao salvar, vídeo em todos os exercícios, ícones no tamanho certo, tema claro |
| `teste-serie.js` | Série marcada vira linha, editar, desmarcar, descanso que some, prancha pelo cronômetro |
| `teste-peso.js` | Peso digitado na série 1 vai para as outras; série trocada na mão não muda |
| `teste-mini.js` | Card minimiza na última série; abrir, minimizar, corrigindo um número, trocar de aba, finalizar |
| `teste-todos.js` | Minimizar todos, abrir um, próximo abre sozinho, repetições que seguem a série 1 |
| `teste-revisao.js` | Treino esquecido aberto, relógio com horas, finalizar sem séries, resumo sem "0 kg" |
| `teste-nuvem.js` | Backup automático no GitHub com a API **simulada**, incluindo configuração pela interface num celular novo, sem sobrescrever o backup, app fechado no meio do envio e chave nova depois de uma vencida (não usa token real) |
| `teste-armazenamento.js` | Falha ao gravar, aviso persistente, exportação dos dados em memória e recuperação do salvamento |
| `teste-geral.js` | Cache offline, página que não é do app fora do cache, site que mudou de endereço, lembrete de backup, fluxo do treino, virada do dia, tema claro com o iPhone no modo escuro |
| `teste-sinal-fraco.js` | Servidor demora 15 s: o app abre pela cópia guardada em ~3 s; com sinal bom, na hora |

## Bom saber

- Os roteiros usam a ficha 2. Quase todos começam com um ciclo A–D já feito, para valerem as séries da tabela (fora da semana de adaptação).
- `rodar.js` tenta de novo quando o servidor fecha uma conexão parada ("other side closed"), um vai e vem normal do `fetch` do Node.

- Erros de JavaScript reprovam a suíte. O teste geral identifica separadamente falhas de rede da fonte do Google; outros erros de console reprovam.
- `teste-geral.js` e `teste-sinal-fraco.js` ligam e desligam a lentidão do servidor em `/__lento` e `/__normal`; `/__mudou` faz a página redirecionar.
- Os roteiros rodam no fuso America/Sao_Paulo. Mensagens como "Treino de hoje feito" dependem da data em que rodam.
