# Treino do Renan — app para o iPhone

Pasta com o app completo para usar fora do Claude, instalado na Tela de Início.

- `index.html`: o app
- `sw.js`: guarda o app no celular para abrir sem internet
- `manifest.webmanifest` e `icon-*.png`: nome e ícone na Tela de Início

## 1. Colocar no ar

O app precisa de um endereço que comece com `https://`. Abrindo o arquivo direto no celular, o iPhone não instala o app, não guarda os treinos direito e os vídeos do YouTube não tocam.

**Netlify (mais rápido, pelo computador)**
1. Descompacte o zip.
2. Entre em app.netlify.com/drop com uma conta grátis, para o site não ser apagado.
3. Arraste a pasta descompactada para a página.
4. Anote o endereço que aparece, algo como `https://nome-qualquer.netlify.app`.

**GitHub Pages (grátis e permanente)**
1. Crie um repositório público, por exemplo `treino`.
2. Em Add file > Upload files, envie os arquivos da pasta (não o zip).
3. Em Settings > Pages, escolha a branch `main` e salve.
4. O endereço fica `https://seu-usuario.github.io/treino/`.

## 2. Instalar no iPhone

1. Abra o endereço no Safari.
2. Toque em ••• > Compartilhar > Adicionar à Tela de Início > Adicionar.
3. Use sempre pelo ícone. O Safari e o ícone guardam os dados separados.

## 3. Seus treinos

- No primeiro uso, o app já vem com os 8 treinos registrados até 26/09/2026.
- Depois disso, os treinos ficam salvos só neste celular. Toque em **Salvar backup** de vez em quando e guarde o arquivo no Arquivos, no iCloud Drive ou no WhatsApp.
- **Restaurar backup** junta os treinos do arquivo com os do celular, sem apagar nada.
- Este app e o app de dentro do Claude são separados: o que você marca em um não aparece no outro.

## 4. Bom saber

- Os vídeos precisam de internet. O resto funciona sem sinal depois da primeira abertura.
- Se algum vídeo sair do ar, use **Outros vídeos no YouTube**, que fica logo abaixo.
- O iPhone não deixa sites vibrarem. No fim do descanso, a barra de baixo fica amarela e o app apita, se o celular não estiver no silencioso.
- A tela fica acesa durante o treino quando o iPhone permite.

## 5. Atualizar o app

Publique a pasta nova no mesmo endereço e troque o número de `VERSAO` no `sw.js` (por exemplo, de `v3` para `v4`). Os treinos salvos no celular continuam.
