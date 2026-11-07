# Checklist do beta: o que depende de fora do código

## 1. Banco de dados (projeto `dsfgrcdtczbkdkciwjaa`)

O projeto estava pausado. Foi reativado e estava **vazio** (0 usuários, 0 clientes). Pelo MCP do Supabase, apliquei estas migrações (com outro número de versão, o do dia da aplicação):

| Arquivo | Versão no remoto |
|---|---|
| 20261027140000_deliverables | 20261107033129 |
| 20261027150000_approvals (sem a view e a função `portal_respond` antigas, recriadas depois) | 20261107033153 |
| 20261027160000_meetings (sem a view) | 20261107033208 |
| 20261027170000_scope_finance (sem a view) | 20261107033242 |
| 20261028100000_client_color | 20261107033253 |

**Parou em `20261028110000_deliverable_slots`**: o servidor do Supabase pediu confirmação humana para um `drop function` e um `delete` (sem efeito num banco vazio) e a pergunta ficou sem resposta.

Para terminar, escolha um dos caminhos.

**A. Pelo CLI (recomendado):**

```bash
pnpm exec supabase link --project-ref dsfgrcdtczbkdkciwjaa
```

```bash
pnpm exec supabase migration repair --status reverted 20261107033129 20261107033153 20261107033208 20261107033242 20261107033253
```

```bash
pnpm exec supabase migration repair --status applied 20261027140000 20261027150000 20261027160000 20261027170000 20261028100000
```

```bash
pnpm exec supabase db push
```

O `db push` aplica de `20261028110000_deliverable_slots` até `20261107160000_reports`, nesta ordem. Como o banco está vazio, o `delete` de tarefas antigas não apaga nada.

**B. Pelo SQL Editor:** cole e rode, um por vez e nesta ordem, os arquivos de `supabase/migrations/` de `20261028110000` em diante.

Depois de aplicar:

```bash
pnpm db:types:remote
```

Isso troca os tipos ajustados à mão (`scripts/types_patch.py`) pelos tipos reais. Rode `pnpm typecheck` em seguida.

**Seed de demonstração** (só em banco local ou de teste, nunca em produção): `supabase/seed.sql` cria `demo@pauta.dev` / `demo123456`.

## 2. Variáveis de ambiente obrigatórias

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`: sem ela não funcionam o portal do cliente, a prévia do convite, o briefing, o kit, a proposta, o contrato, o relatório público, os jobs e o login por provedor.
- `ENCRYPTION_KEY` (`openssl rand -base64 32`): cifra os tokens de terceiros. Não troque depois de usar.
- `CRON_SECRET`: protege `/api/jobs/*`.
- `ANTHROPIC_API_KEY`: sem ela, a IA responde em modo demonstração.

## 3. Jobs agendados

Já agendados no próprio banco pelas migrações, se o `pg_cron` estiver ativo (Database > Extensions):
- `pauta-gerar-mes` (dia 20, monta o mês seguinte)
- `pauta-lembretes` (de hora em hora: lembrete de 48 h e aprovação tácita)
- `pauta-briefs` (a cada 5 minutos: brief 15 minutos antes)
- `pauta-renovacoes` (diário: contratos vencendo em 30 dias)

Precisam chamar o app (ative também `pg_net`) e devem ser criados no SQL Editor, trocando `SEU_DOMINIO` e `SEU_CRON_SECRET`:

```sql
select cron.schedule('pauta-publicar', '* * * * *', $$ select net.http_post(url := 'https://SEU_DOMINIO/api/jobs/publicar', headers := '{"Authorization":"Bearer SEU_CRON_SECRET"}'::jsonb) $$);
select cron.schedule('pauta-tokens', '23 4 * * *', $$ select net.http_post(url := 'https://SEU_DOMINIO/api/jobs/renovar-tokens', headers := '{"Authorization":"Bearer SEU_CRON_SECRET"}'::jsonb) $$);
select cron.schedule('pauta-metricas', '37 5 * * *', $$ select net.http_post(url := 'https://SEU_DOMINIO/api/jobs/metricas', headers := '{"Authorization":"Bearer SEU_CRON_SECRET"}'::jsonb) $$);
select cron.schedule('pauta-relatorios', '13 7 1 * *', $$ select net.http_post(url := 'https://SEU_DOMINIO/api/jobs/relatorios', headers := '{"Authorization":"Bearer SEU_CRON_SECRET"}'::jsonb) $$);
select cron.schedule('pauta-cobrancas', '47 10 * * *', $$ select net.http_post(url := 'https://SEU_DOMINIO/api/jobs/cobrancas', headers := '{"Authorization":"Bearer SEU_CRON_SECRET"}'::jsonb) $$);
select cron.schedule('pauta-resumo', '0 10 * * *', $$ select net.http_post(url := 'https://SEU_DOMINIO/api/jobs/resumo', headers := '{"Authorization":"Bearer SEU_CRON_SECRET"}'::jsonb) $$);
```

(Horários em UTC: 10:00 UTC = 7h em Brasília.)

## 4. Integrações (hoje em modo demonstração)

Passo a passo de cada uma em `docs/oauth-setup.md`; para achar os pontos marcados no código: `grep -rn "TODO(oauth-setup)" src`.

- [ ] Supabase Auth: Site URL, Redirect URLs e e-mail em português
- [ ] Google (login, Agenda e Drive) e verificação do app para `drive.file` e `calendar.events`
- [ ] Apple (Services ID)
- [ ] ChatGPT (login OIDC e escopos de uso do plano); validar assinatura do `id_token`
- [ ] Meta: app Empresa, Facebook Login for Business, Business Login for Instagram e **revisão do app** (`docs/meta-app-review.md`)
- [ ] Canva: integração Connect com return navigation; publicar o app de `apps/canva-app`
- [ ] Granola: descoberta OAuth e registro dinâmico (TODO no código)
- [ ] Asaas: chave, webhook com token, cadastro fiscal na prefeitura (serviço municipal e alíquota)
- [ ] Clicksign ou ZapSign e `SIGNATURE_WEBHOOK_TOKEN`
- [ ] Resend: domínio verificado e `EMAIL_FROM`
- [ ] Trocar `INTEGRATIONS_MODE=mock` para `real`

## 5. Conteúdo e jurídico

- [ ] Termos de uso e Política de privacidade (a tela de login cita os dois)
- [ ] Página de exclusão de dados (exigida pela Meta)
- [ ] Revisar o modelo de contrato padrão (Comercial > Modelo do contrato) com um advogado
- [ ] Logos oficiais de ChatGPT, Google, Apple e Meta conforme as regras de cada marca (hoje há marcas simplificadas)

## 6. Conferências que não deu para fazer neste ambiente

- [ ] Revisão visual das telas logadas contra `docs/design/` (aqui não havia backend de autenticação funcionando: o remoto estava migrado pela metade e sem service role; o login foi conferido e bate com o design)
- [ ] Rodar `pnpm db:test` com `supabase start` (aqui os 19 arquivos de teste rodaram num Postgres 16 com esqueleto do Supabase: `scripts/db-test-local.sh`)
- [ ] Teste de ponta a ponta com uma conta real de cada provedor
- [ ] Auditoria de acessibilidade com leitor de tela e ferramenta automática (axe)
