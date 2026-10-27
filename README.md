# Treino do Renan — app para o iPhone

App de treino (A, B, C e D) para usar fora do Claude, instalado na Tela de Início.

Endereço: **https://dheprx.github.io/treino-app/**

- `index.html`: o app
- `sw.js`: guarda o app no celular para abrir sem internet
- `manifest.webmanifest`, `icon-*.png` e `icone.svg`: nome e ícone na Tela de Início
- `.nojekyll`: faz o GitHub Pages publicar os arquivos como estão

A pasta `testes/` é usada só no desenvolvimento. Os roteiros recriam `testes/prints/` quando precisam; prints e `node_modules/` não entram no Git nem são necessários para usar o app. Guarde os arquivos de backup no aparelho ou no repositório privado `treino-dados`, separado deste site público.

## 1. Colocar no ar (uma vez só)

O app precisa de um endereço que comece com `https://`. Abrindo o arquivo direto no celular, o iPhone não instala o app, não guarda os treinos direito e os vídeos do YouTube não tocam.

1. **Deixe o repositório público.** No plano grátis, o GitHub Pages só publica repositório público. Em **Settings > General**, role até o fim, toque em **Change visibility** e escolha **Public**.
2. Confira se os arquivos estão na branch `main`.
3. Em **Settings > Pages**, em **Build and deployment > Source**, deixe **Deploy from a branch**. Em **Branch**, escolha `main` e a pasta `/ (root)`, e toque em **Save**.
4. Espere 1 ou 2 minutos. O endereço aparece no topo da página do Pages.

No celular, se algum botão não aparecer, toque em **aA** na barra do Safari e depois em **Solicitar Site para Computador**.

## 2. Instalar no iPhone

1. Abra o endereço no Safari.
2. Toque em ••• > Compartilhar > Adicionar à Tela de Início > Adicionar.
3. Use sempre pelo ícone. O Safari e o ícone guardam os dados separados.

**Trocar o ícone:** o iPhone só mostra um ícone novo quando você adiciona o app de novo. E apagar o app da Tela de Início apaga os treinos guardados nele. Então:

1. Finalize ou descarte o treino em andamento.
2. Toque em **Salvar backup** e guarde o arquivo no Arquivos.
3. Apague o ícone antigo da Tela de Início.
4. Adicione de novo pelo Safari (passo 2 acima).
5. Abra pelo ícone novo e toque em **Restaurar backup**, escolhendo o arquivo.

## 3. A ficha (desde 28/09/2026)

Ordem A → B → C → D, sem dia fixo, 3 a 4 vezes por semana. A e C são superiores; B e D são pernas e tronco.
A ficha tira carga direta da coluna (sem afundo com carga, abdominal com carga nem serrote) e divide as pernas em dois dias mais leves.

| Treino | Exercícios |
| --- | --- |
| **A · Superiores 1** | supino reto com halteres, puxada frontal, remada com halteres no banco inclinado, supino inclinado articulado, elevação lateral sentado, tríceps barra V, rosca direta barra W |
| **B · Pernas 1 + tronco** | leg press 45°, cadeira flexora, elevação pélvica, cadeira extensora, panturrilha no leg press, elevação lateral sentado, rosca martelo sentado, bird-dog |
| **C · Superiores 2** | supino inclinado com halteres, puxada com triângulo, remada com halteres no banco inclinado, crucifixo na polia, crucifixo invertido na polia, elevação lateral na polia, rosca Scott alternada, tríceps corda |
| **D · Pernas 2 + tronco** | cadeira flexora, leg press 45°, cadeira extensora, elevação pélvica, cadeira abdutora, panturrilha no leg press, elevação lateral sentado, tríceps barra V, prancha |

- **Adaptação:** até fazer A, B, C e D uma vez na ficha nova, todos os exercícios aparecem com 2 séries, terminando com umas 3 repetições sobrando. Essa etapa é inicial e não recomeça a cada semana.
- **Esforço depois disso:** superiores com 1 a 2 repetições sobrando; pernas com 2 a 3. Não precisa ir até a falha. As cargas antigas de perna (160 kg no leg press, 90 kg na extensora) não são meta.
- **Subir carga:** nos superiores e nas pernas, só considere um aumento depois de duas sessões completas do mesmo exercício, na mesma carga e no topo da faixa em todas as séries previstas. Para sugerir o menor incremento disponível, o app também pede seu registro de execução controlada, ausência de desconforto e repetições sobrando nas duas sessões. Ele mantém os pesos preenchidos; a decisão continua sendo sua, com o professor. Sem essas respostas, informa o que falta. Treinos curtos e de adaptação continuam registrados, mas não geram esse aviso de progressão.
- **Um treino por dia:** depois de salvar, o treino fica concluído e os outros travam até o dia seguinte. Finalizou sem querer? "Reabrir o treino" volta com as séries marcadas.
- **Versão curta** (uso ocasional, cerca de 30 a 40 minutos): só os 4 primeiros exercícios, com 2 séries, quando faltar tempo ou disposição. No B e no D dá para incluir o exercício de tronco; depois continue a sequência A → B → C → D.
- **Segurança:** pare se aparecer dor que desce pela perna, formigamento, dormência ou perda de força, e procure avaliação. Se o joelho doer mais no dia seguinte, inchar ou travar, diminua amplitude ou carga.
- **Viagem:** último treino de pernas (B ou D) até 30/10; os 2 últimos antes de viajar são leves; 04/11 é descanso; volta em 11/11.
- Os treinos antigos (ficha 1: A Empurrar, B Puxar, C Pernas e abdômen, D Superior) continuam no calendário com os nomes da época.

## 4. Seus treinos

- **Progresso:** mostra os dias treinados nos últimos 7 e 28 dias e compara as sessões detalhadas disponíveis de cada exercício. A comparação respeita a ficha, a carga e o número de séries; aumentar o peso sozinho não comprova melhora nem ganho de massa muscular.
- **Como foi este exercício?** Abra essa opção no card durante o treino para registrar quantas repetições sobraram na última série, se manteve a execução e se houve dor ou desconforto. É opcional; sem resposta, fica como não informado. Esses dados acompanham o treino no backup. Para corrigir os registros do treino de hoje, use **Reabrir o treino**.
- Se precisar parar antes de concluir qualquer série, finalize mesmo assim: os relatos ficam guardados como **interrompido**, sem avançar a sequência nem contar um treino concluído. Um treino vazio, sem séries nem relatos, não gera registro.
- A análise se atualiza ao salvar ou restaurar treinos e funciona offline, com regras explicadas na tela. O app usa os dados que você registra; não observa sua execução nem recebe automaticamente informações desta conversa ou da Smart Fit. Os registros manuais contam na frequência, mas só sessões com séries detalhadas permitem comparar o desempenho. O histórico mantém detalhes dos 60 treinos mais recentes; os anteriores podem aparecer apenas como presença e quantidade de séries.
- No primeiro uso, o app já vem com os 8 treinos registrados até 26/09/2026.
- Depois disso, os treinos ficam salvos neste celular e, quando o backup automático está ligado, também têm uma cópia no GitHub. **Salvar backup** permite guardar uma cópia em arquivo. O app mostra a data do último backup e destaca a seção quando passa de 7 dias com treinos novos.
- **Restaurar backup** junta os treinos do arquivo com os do celular, sem apagar nada. Também recupera o treino em andamento, com suas séries e o aquecimento marcado, se não houver outro aberto neste celular e ele ainda não tiver sido finalizado. Arquivos que não são backups do app são recusados.
- **Backup automático no GitHub** (recomendado): em **Backup dos treinos > Backup automático no GitHub > Configurar backup automático**, siga os 3 passos uma vez.
  Depois disso, cada treino finalizado (e cada registro feito ou apagado no calendário) vai sozinho para o `backup.json` do repositório privado `treino-dados`.
  Sem internet, o app envia quando o sinal voltar. Em outro celular, configure com a mesma chave: o histórico existente e um treino em andamento no backup são recuperados antes de habilitar novos envios, seguindo as mesmas regras da restauração por arquivo. A configuração preserva o arquivo remoto; o próximo treino finalizado envia o histórico reunido. **Restaurar do GitHub** continua disponível para repetir a recuperação.
  O GitHub guarda cada versão no histórico do repositório. Quando a chave vencer, o app avisa; crie outra e cole em **Configurar**.
  O app só confirma a ativação depois de guardar a configuração neste aparelho. Se essa gravação falhar, mantém a configuração anterior e avisa. Ao desligar, também só confirma que apagou a chave depois de salvar essa mudança.
- Este app e o app de dentro do Claude são separados: o que você marca em um não aparece no outro.
- Apagar o app da Tela de Início apaga os treinos junto. Salve um backup antes.

Se o aparelho não conseguir salvar, aparece um aviso com **Salvar backup agora**. Esse botão exporta os dados que ainda estão na tela. Não feche o app antes de guardar esse arquivo; o aviso só desaparece quando uma nova gravação local funciona.

## 5. Bom saber

- **Aquecimento inicial:** marque só o cardio e as séries leves do primeiro exercício. Ao concluir esses dois itens, o aquecimento fica feito. A preparação dos outros exercícios aparece no próprio card, para fazer quando chegar a ele e conforme necessário. Ela não substitui as séries do treino.
- Digite o peso e as repetições só na série 1: as séries seguintes do exercício já vêm com eles.
- **Minimizar todos** fecha todos os exercícios numa linha cada, com quantas séries faltam (ex.: "0 de 3 séries · 3 × 8–12 · 18 kg"). Abra só o que vai fazer; quando terminar, o próximo abre sozinho. Cada exercício também tem seu botão **Minimizar**.
- Ao marcar uma série, ela vira uma linha (ex.: "18 kg × 8"). Toque em **editar** para corrigir, ou no ✓ para desmarcar.
- Quando todas as séries de um exercício estão feitas, o card inteiro minimiza e a tela vai para o próximo. Toque em **Abrir** para ver de novo.
- Esqueceu de finalizar? O app avisa que o treino ficou aberto; ao finalizar, salva com a duração normal do treino.
- Os vídeos precisam de internet. O resto funciona sem sinal depois da primeira abertura.
- Com sinal fraco, o app espera a internet por até 3 segundos e depois abre a cópia guardada no celular.
- Se algum vídeo sair do ar, use **Outros vídeos no YouTube**, que fica logo abaixo.
- O iPhone não deixa sites vibrarem. No fim do descanso, a barra de baixo fica amarela e o app apita, se o celular não estiver no silencioso. O apito só toca com o app aberto na tela.
- A tela fica acesa durante o treino quando o iPhone permite.

## 6. Atualizar o app

1. Troque o `index.html` no repositório (Add file > Upload files, com o mesmo nome).
2. No `sw.js`, troque o número de `VERSAO` (por exemplo, de `v22` para `v23`) e suba ele também.
3. No iPhone, feche o app (arraste para cima na troca de apps) e abra de novo. Com internet, a versão nova aparece na hora.

Os treinos salvos no celular continuam.
