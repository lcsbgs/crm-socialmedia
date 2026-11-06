# Configurar as integrações reais

Nesta rodada todas as integrações rodam em **modo demonstração** (`INTEGRATIONS_MODE=mock`): os botões funcionam, a conexão é simulada e os dados são de exemplo, com o selo "modo demonstração". Este guia diz, para cada integração, onde criar o app, quais URLs de callback cadastrar, quais escopos pedir e quais variáveis preencher.

## Como sair do modo demonstração

1. Configure as integrações que vai usar (seções abaixo). As que ficarem sem credencial mostram "não configurado" e não quebram o resto.
2. Preencha `ENCRYPTION_KEY` (`openssl rand -base64 32`). Ela cifra os tokens de terceiros guardados no banco. **Não troque depois** sem recifrar os tokens.
3. Preencha `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET`.
4. Troque `INTEGRATIONS_MODE=mock` por `INTEGRATIONS_MODE=real` e reinicie o app.
5. Conexões simuladas criadas antes continuam marcadas como simuladas (`simulated = true`) e não são usadas no modo real: reconecte cada conta.

Em todas as URLs abaixo, troque `https://SEU_DOMINIO` pelo valor de `NEXT_PUBLIC_APP_URL`. Em desenvolvimento: `http://localhost:3000`.

Onde o código espera a configuração, há comentários `TODO(oauth-setup)`. Para achar todos: `grep -rn "TODO(oauth-setup)" src`.

---

## 1. Login por e-mail (Supabase), já funciona

- Supabase > Authentication > URL Configuration: **Site URL** = `https://SEU_DOMINIO`; **Redirect URLs**: `https://SEU_DOMINIO/auth/callback`.
- Supabase > Authentication > Emails: personalize o e-mail do link mágico em português.
- Para envio próprio (domínio do estúdio), configure SMTP em Authentication > SMTP Settings.
- E-mail e senha aparecem só em desenvolvimento. Em produção, para liberar: `ALLOW_PASSWORD_LOGIN=true`.

## 2. Login com Google (Supabase)

1. Google Cloud Console > APIs e serviços > Credenciais > Criar ID do cliente OAuth (Aplicativo da Web).
2. Origens JavaScript autorizadas: `https://SEU_DOMINIO`.
3. URI de redirecionamento autorizado: `https://<ref-do-projeto>.supabase.co/auth/v1/callback`.
4. Tela de consentimento: escopos `openid`, `email`, `profile` (só isso para o login).
5. Supabase > Authentication > Providers > Google: cole Client ID e Client Secret.
6. Nada a preencher no `.env` para o login (o Supabase guarda as chaves).

## 3. Login com Apple (Supabase)

1. Apple Developer > Certificates, Identifiers & Profiles: crie um **Services ID** com "Sign in with Apple".
2. Domains: `<ref-do-projeto>.supabase.co`; Return URL: `https://<ref-do-projeto>.supabase.co/auth/v1/callback`.
3. Crie uma chave (Keys) com Sign in with Apple e gere o client secret (JWT) conforme o guia do Supabase.
4. Supabase > Authentication > Providers > Apple: Services ID, Team ID, Key ID e o secret.
5. Escopos pedidos pelo app: `name email`.

## 4. Login com ChatGPT (Sign in with ChatGPT, OpenAI)

O login usa OAuth 2.0 + OIDC com PKCE, feito no servidor do Pauta (`/auth/chatgpt/start` e `/auth/chatgpt/callback`). O usuário é vinculado pelo **e-mail verificado** e a sessão do Supabase é aberta com um link mágico gerado no servidor (precisa da service role).

1. No painel de desenvolvedor da OpenAI, crie um app OAuth para Sign in with ChatGPT.
2. Redirect URI: `https://SEU_DOMINIO/auth/chatgpt/callback`.
3. Escopos do **login**: `openid profile email`. Nada além disso.
4. `.env`: `OPENAI_OAUTH_CLIENT_ID`, `OPENAI_OAUTH_CLIENT_SECRET` e, se a OpenAI publicar outro emissor, `OPENAI_OAUTH_ISSUER`.
5. Pendência marcada no código: validar a assinatura do `id_token` pelo JWKS do emissor (`src/app/auth/chatgpt/callback/route.ts`).
6. Se o Supabase passar a aceitar provedores OIDC customizados no seu plano, dá para trocar o fluxo próprio por ele: cadastre o emissor em Authentication > Providers e mude `realLoginAdapter` em `src/features/auth/providers/real.ts` para `signInWithOAuth`.

## 5. IA com o plano do ChatGPT (OpenAI)

Separado do login: é pedido em Ajustes > IA e ChatGPT, com escopos de uso.

1. No mesmo app OAuth da OpenAI, habilite os escopos de uso do plano (os nomes exatos estão na documentação da OpenAI para apps que usam a assinatura do ChatGPT).
2. Redirect URI: `https://SEU_DOMINIO/api/ai/chatgpt/callback`.
3. `src/lib/ai/providers/openai-chatgpt.ts` tem os `TODO(oauth-setup)` para o endpoint de respostas e os escopos.
4. Os tokens ficam cifrados em `ai_connections` com `ENCRYPTION_KEY`.
5. Se a conta não for elegível ou o limite semanal acabar, o Pauta cai para os créditos (Anthropic) e avisa.

## 6. IA com créditos do Pauta (Anthropic)

- `.env`: `ANTHROPIC_API_KEY` e `ANTHROPIC_MODEL`. Sem a chave, as ações de IA respondem com texto de demonstração.

## 7. Meta: Facebook e Instagram

Duas formas de login, ambas no mesmo app da Meta (developers.facebook.com):

**Facebook Login for Business** (páginas do Facebook e Instagram ligado a página):
1. Crie um app do tipo Empresa. Adicione o produto "Facebook Login for Business".
2. Crie uma **Configuração** com as permissões abaixo e copie o `config_id` para `META_CONFIG_ID`.
3. URI de redirecionamento OAuth válido: `https://SEU_DOMINIO/api/integrations/meta/callback`.
4. Permissões: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `business_management`.

**Business Login for Instagram** (Instagram profissional sem página):
1. No mesmo app, adicione "Instagram" > API com login do Instagram.
2. Redirect: `https://SEU_DOMINIO/api/integrations/instagram/callback`.
3. Escopos: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights`.
4. `.env`: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`.

`.env`: `META_APP_ID`, `META_APP_SECRET`, `META_CONFIG_ID`, `META_GRAPH_VERSION`.

Para publicar para clientes reais o app precisa passar pela **revisão da Meta**: roteiro e justificativas em `docs/meta-app-review.md`.

## 8. Google Agenda e Google Drive

1. No mesmo projeto do Google Cloud do login, ative **Google Calendar API**, **Google Drive API** e **Google Picker API**.
2. Crie outro ID do cliente OAuth (Aplicativo da Web) só para integrações, ou reaproveite o do login.
3. Redirect: `https://SEU_DOMINIO/api/integrations/google/callback`.
4. Escopos: `https://www.googleapis.com/auth/calendar.events` e `https://www.googleapis.com/auth/drive.file` (só os arquivos que o usuário escolher no Picker ou que o Pauta criar). Peça `access_type=offline` e `prompt=consent` para receber refresh token.
5. Crie uma chave de API restrita ao Picker e ao seu domínio.
6. `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, `NEXT_PUBLIC_GOOGLE_APP_ID` (número do projeto).
7. `drive.file` e `calendar.events` são escopos sensíveis: o app precisa de verificação do Google antes de sair do modo teste.

## 9. Granola

O Pauta é cliente MCP do servidor hospedado do Granola, com OAuth por usuário.

1. `.env`: `GRANOLA_MCP_URL` (padrão `https://mcp.granola.ai/mcp`).
2. O servidor MCP do Granola faz descoberta OAuth (RFC 8414) e registro dinâmico de cliente: não há app para criar. Redirect usado: `https://SEU_DOMINIO/api/integrations/granola/callback`.
3. Cada pessoa conecta a própria conta em Ajustes > Integrações. Sem conexão, dá para colar as notas da reunião.

## 10. Canva

**Connect API (criar e importar designs):**
1. canva.com/developers > Integrations > criar integração pública.
2. Redirect: `https://SEU_DOMINIO/api/integrations/canva/callback`.
3. Escopos: `design:content:read`, `design:content:write`, `design:meta:read`, `asset:read`, `asset:write`, `profile:read`.
4. Ative **Return navigation** com a URL `https://SEU_DOMINIO/api/integrations/canva/return`. Quando a pessoa clica em "Voltar para o Pauta", o design é exportado e entra como nova versão do post.
5. `.env`: `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`.

**App dentro do Canva (botão "Enviar para o Pauta"):** código em `apps/canva-app` (Apps SDK). Veja o README da pasta para rodar com `npm start` e publicar no painel de desenvolvedores do Canva.

## 11. Asaas: boleto, Pix e NFS-e

1. Crie conta no sandbox: sandbox.asaas.com. Gere a chave de API em Integrações.
2. `.env`: `ASAAS_API_KEY`, `ASAAS_BASE_URL` (sandbox `https://api-sandbox.asaas.com/v3`, produção `https://api.asaas.com/v3`).
3. Webhook: Integrações > Webhooks > URL `https://SEU_DOMINIO/api/webhooks/asaas`, eventos de cobrança (`PAYMENT_*`) e de nota fiscal (`INVOICE_*`). Defina um token de autenticação e copie para `ASAAS_WEBHOOK_TOKEN` (o Pauta recusa chamadas sem ele).
4. NFS-e: em Notas fiscais, configure o cadastro na prefeitura (inscrição municipal, serviço, alíquota). O Pauta pede a emissão quando a cobrança é paga.
5. Em Ajustes > Integrações, escolha o provedor "Asaas" (o padrão é "manual").

## 12. Assinatura de contratos: Clicksign ou ZapSign

- Clicksign: crie conta sandbox, gere o access token. `.env`: `SIGNATURE_PROVIDER=clicksign`, `CLICKSIGN_ACCESS_TOKEN`, `CLICKSIGN_BASE_URL`. Webhook: `https://SEU_DOMINIO/api/webhooks/assinatura`.
- ZapSign: gere o token da API. `.env`: `SIGNATURE_PROVIDER=zapsign`, `ZAPSIGN_API_TOKEN`. Mesmo webhook.
- Sem provedor, o contrato usa a assinatura simples do portal (nome, data, IP).

## 13. E-mail (Resend)

1. resend.com: verifique o domínio do remetente.
2. `.env`: `RESEND_API_KEY`, `EMAIL_FROM` (ex.: `Pauta <oi@seudominio.com.br>`).
3. Usado para convites, resumo diário e envio ao contador. Em modo demonstração os e-mails só aparecem no log do servidor.

## 14. Jobs agendados

A fila de publicação (a cada minuto), lembretes do portal (48 h), coleta de métricas e relatórios são rotas em `/api/jobs/*` protegidas por `CRON_SECRET`, chamadas pelo `pg_cron` + `pg_net` do Supabase. Os comandos `cron.schedule` estão comentados nas migrações; para ativar, rode no SQL Editor trocando a URL e o segredo (detalhes em `docs/beta-checklist.md`).
