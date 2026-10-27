# Decisões

Registro curto de escolhas feitas quando a especificação deixava margem. Mais recentes no fim.

## 2026-10-27 · Fase 0

- **Next.js 16.4 sem Cache Components.** O template novo liga `cacheComponents` e `partialPrefetching`. Quase toda tela do app depende da sessão e do workspace, então o ganho é pequeno e a complexidade (Suspense obrigatório em toda leitura de cookie) é grande. Desligado; dá para reavaliar depois.
- **`proxy.ts` no lugar de `middleware.ts`.** No Next 16 o middleware foi renomeado para proxy. Ele só renova a sessão do Supabase e redireciona visitantes não logados para `/login`. A autorização real fica no RLS e nas server actions.
- **Supabase CLI como devDependency** (`pnpm exec supabase ...`), para não depender de instalação global.
- **Env validada com Zod.** Variáveis públicas são validadas no carregamento; as de servidor (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_*`) só quando usadas, em `src/lib/env.server.ts`, que importa `server-only`.
- **Modelo padrão no `.env.example`:** `claude-sonnet-5-5`, trocável via `ANTHROPIC_MODEL`.

## 2026-10-27 · Fase 1

- **Owner também é linha em `workspace_members`** (role `owner`). `workspaces.owner_id` fica como referência rápida; a autorização usa sempre `workspace_members`.
- **Sem insert direto em `workspaces` e `workspace_members`.** Entrada só por RPCs `security definer`: `create_workspace`, `accept_invitation`, `complete_onboarding` e o trigger de cadastro. Assim nenhuma policy de insert precisa existir.
- **Grants explícitos.** O Supabase concede tudo a `anon`/`authenticated` por padrão (tabelas e `execute` de funções). As migrations revogam tudo e liberam só o necessário. `anon` não acessa nenhuma tabela de negócio. Cada migration nova deve repetir o padrão revoke/grant.
- **Colunas protegidas por trigger:** `plano`, `owner_id` e `slug` não mudam via API (só service role ou SQL direto). O plano é trocado manualmente no banco: `update workspaces set plano = 'pro' where slug = '...'`.
- **Slug imutável depois do onboarding.** É gerado do nome na criação e regerado uma única vez no onboarding (`complete_onboarding`). Renomear depois não muda a URL, para não quebrar links. `novo` é reservado (`/w/novo`).
- **Limite de membros conta convites pendentes e não expirados.** O trigger trava a linha do workspace (`for update`) para evitar corrida. No aceite, o convite é marcado como aceito antes de inserir o membro, para não contar em dobro. O erro leva `hint = 'PLAN_LIMIT_MEMBERS'`, que a UI traduz.
- **Convite exige o mesmo e-mail** da conta logada. Quem entra por convite pula o onboarding do workspace pessoal (que continua existindo).
- **Owner não sai nem é removido.** Para deixar de ser owner seria preciso transferir a posse; fora do MVP.
- **Dropdowns com `<details>`** em vez de lib de UI: acessível por teclado, sem dependência.
- **Onboarding em uma etapa nesta fase** (nome + nome do negócio). Primeiro cliente e pacote entram na Fase 2.
- **Tipos gerados do banco local** (`pnpm db:types`) enquanto o remoto não tem as migrations; depois do push, usar `pnpm db:types:remote`.

## 2026-10-27 · Fase 2

- **FKs compostas `(client_id, workspace_id)`.** Tarefas, cobranças e o pacote do cliente referenciam `(id, workspace_id)` da tabela pai. O banco impede que um registro aponte para cliente ou pacote de outro workspace, além do RLS.
- **Limite de clientes conta só ativos e pausados.** Encerrar um cliente libera a vaga; reativar respeita o limite. O trigger checa membership antes de revelar o limite.
- **`generate_month` é `security definer` com checagem de membership** (pela API) e livre sem auth (pg_cron/SQL). Idempotência por índices únicos: tarefas em `(client_id, competencia, template_key)` e cobranças em `(client_id, competencia)`, com `on conflict do nothing`.
- **Distribuição das tarefas no mês:** mensal = N datas espalhadas pelo mês; semanal = N por semana a partir de cada segunda que cai no mês (seg a sex, limitado ao último dia do mês); diária = N por dia útil. Título "Tipo n/total". Clientes pausados/encerrados e com contrato começando depois do mês não geram nada.
- **Vencimento:** `dia_vencimento` aceita 1 a 31; em meses mais curtos vira o último dia. Sem dia definido, usa 10. Clientes sem `valor_mensal` não geram cobrança.
- **Status `atrasado`** é gravado quando `generate_month` roda e, na UI, também é derivado (pendente com vencimento passado). A Fase 6 revisa isso.
- **Fuso:** datas de negócio usam America/Sao_Paulo (UI e banco). A linha do tempo converte colunas `date` para meia-noite de São Paulo.
- **Linha do tempo é uma view `security_invoker`**, então herda o RLS das tabelas. Fases seguintes acrescentam fontes com `create or replace view`.
- **Abas da ficha do cliente via `?aba=`** numa única rota. Entregas, Reuniões e Escopo ficam como placeholder até as fases correspondentes.
- **Onboarding em duas etapas:** nome/negócio (Fase 1) e depois `/w/[slug]/comecar` (primeiro cliente + escolher ou criar pacote, com itens sugeridos). Pode pular.
