# Treino do Renan — app para o iPhone

App de treino (A, B, C e D) para usar fora do Claude, instalado na Tela de Início.

Endereço: **https://dheprx.github.io/treino-app/**

- `index.html`: o app
- `sw.js`: guarda o app no celular para abrir sem internet
- `manifest.webmanifest` e `icon-*.png`: nome e ícone na Tela de Início
- `.nojekyll`: faz o GitHub Pages publicar os arquivos como estão

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

## 3. Seus treinos

- No primeiro uso, o app já vem com os 8 treinos registrados até 26/09/2026.
- Depois disso, os treinos ficam salvos só neste celular. Toque em **Salvar backup** de vez em quando e guarde o arquivo no Arquivos, no iCloud Drive ou no WhatsApp. O app mostra a data do último backup e destaca a seção quando passa de 7 dias com treinos novos.
- **Restaurar backup** junta os treinos do arquivo com os do celular, sem apagar nada.
- Este app e o app de dentro do Claude são separados: o que você marca em um não aparece no outro.
- Apagar o app da Tela de Início apaga os treinos junto. Salve um backup antes.

## 4. Bom saber

- Os vídeos precisam de internet. O resto funciona sem sinal depois da primeira abertura.
- Com sinal fraco, o app espera a internet por até 3 segundos e depois abre a cópia guardada no celular.
- Se algum vídeo sair do ar, use **Outros vídeos no YouTube**, que fica logo abaixo.
- O iPhone não deixa sites vibrarem. No fim do descanso, a barra de baixo fica amarela e o app apita, se o celular não estiver no silencioso. O apito só toca com o app aberto na tela.
- A tela fica acesa durante o treino quando o iPhone permite.

## 5. Atualizar o app

1. Troque o `index.html` no repositório (Add file > Upload files, com o mesmo nome).
2. No `sw.js`, troque o número de `VERSAO` (por exemplo, de `v4` para `v5`) e suba ele também.
3. No iPhone, feche o app (arraste para cima na troca de apps) e abra de novo. Com internet, a versão nova aparece na hora.

Os treinos salvos no celular continuam.
