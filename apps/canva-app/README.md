# App do Pauta dentro do Canva

App feito com o Canva Apps SDK. Mostra o botão **Enviar para o Pauta**: exporta o design aberto em PNG e manda para um post do Pauta como nova versão.

## Como usar
1. No Pauta: Ajustes > Integrações > Canva > **Gerar código do app**. Copie o código (fica ligado à sua conta).
2. No editor do post do Pauta, copie o **código do post** (seção Arte).
3. No Canva, abra o app "Pauta", cole os dois códigos e clique em Enviar para o Pauta.

## Desenvolvimento
Este diretório não faz parte do build do Next. Para rodar:

```bash
cd apps/canva-app
npm install
npm start
```

Depois, no painel de desenvolvedores do Canva (canva.com/developers), crie um app, aponte a URL de desenvolvimento para `http://localhost:8080` e abra o app num design.

Variável de build: `PAUTA_URL` (ex.: `https://seu-dominio`). O app chama `POST {PAUTA_URL}/api/integrations/canva/app-upload`.

Para publicar o app, siga o processo de revisão do Canva (Apps SDK > Submit for review).
