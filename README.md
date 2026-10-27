# CRM Social Media (nome provisório)

Back office para profissionais de social media autônomos ou pequenas equipes: clientes, rotina recorrente, entregas, aprovações, reuniões, escopo e cobranças. O nome e a marca ficam centralizados em `src/config/brand.ts`.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS) via `@supabase/ssr` · Zod · Anthropic SDK · pnpm.

## Rodando localmente

Pré requisitos: Node 20+, pnpm, Docker (ou OrbStack) aberto.

```bash
pnpm install
cp .env.example .env.local
pnpm db:start          # sobe o Supabase local e imprime URL e chaves
# copie API URL, anon key e service_role key para o .env.local
pnpm db:reset          # aplica migrations e seed no banco local
pnpm dev               # http://localhost:3000
```

Usuário do seed: `demo@exemplo.com` / `demo123456` (workspace "Estúdio Demo", plano Pro). E-mails locais (magic link, confirmação) chegam no Mailpit: http://127.0.0.1:54324.

Outros comandos:

| Comando | O que faz |
|---|---|
| `pnpm db:test` | roda os testes SQL (pgTAP) em `supabase/tests` |
| `pnpm db:types` | gera `src/types/database.ts` a partir do banco local |
| `pnpm lint` / `pnpm typecheck` | qualidade |

## Variáveis de ambiente

| Variável | Onde | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente e servidor | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente e servidor | chave pública (sujeita ao RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | só servidor | portal do cliente por token; nunca expor |
| `ANTHROPIC_API_KEY` | só servidor | geração de ata com IA |
| `ANTHROPIC_MODEL` | só servidor | modelo usado na ata |
| `NEXT_PUBLIC_APP_URL` | cliente e servidor | base dos links de convite e do portal |

## Aplicando migrations no remoto

O projeto está linkado ao Supabase remoto (`supabase/.temp/project-ref`). Sempre teste localmente antes (`pnpm db:reset && pnpm db:test`).

```bash
pnpm exec supabase db push --linked --dry-run   # confira o que será aplicado
pnpm exec supabase db push --linked
pnpm db:types:remote
```

O `db push` não roda o `seed.sql`. Depois do primeiro push, configure no painel do Supabase (Authentication > URL Configuration) o Site URL e o redirect `<APP_URL>/auth/callback`.

### Trocar o plano de um workspace

Não há gateway de pagamento. No SQL Editor do Supabase:

```sql
update public.workspaces set plano = 'pro' where slug = 'nome-do-workspace';
```

### Agendamentos (opcional)

As migrations trazem, comentados, os comandos de pg_cron para gerar o mês todo dia 1 (`generate_month`) e marcar cobranças atrasadas diariamente (`mark_overdue_payments`).

## Funcionalidades

| Área | Onde |
|---|---|
| Cadastro, login (senha ou link), onboarding | `/cadastro`, `/login`, `/onboarding`, `/w/[slug]/comecar` |
| Workspaces, equipe, convites, plano e limites | seletor no topo, `/w/[slug]/configuracoes`, `/convite/[token]` |
| Tela Hoje (atrasadas, para hoje, esperando o cliente, para receber, reuniões) | `/w/[slug]` |
| Clientes e ficha (visão geral, entregas, calendário, reuniões, financeiro, escopo, linha do tempo) | `/w/[slug]/clientes` |
| Pacotes e Gerar mês (cria slots de entrega e cobranças) | `/w/[slug]/pacotes`, botão em Clientes |
| Quadro de entregas de todos os clientes, visão de semana | `/w/[slug]/entregas` |
| Calendário do mês | `/w/[slug]/calendario` |
| Painel da entrega (legenda, mídia, comentários, histórico, enviar para aprovação) | `?entrega=<id>` em qualquer tela |
| Portal público de aprovação com marca do workspace | `/p/[portal_token]`, botão "Enviar link do portal" na ficha |
| Notificações quando o cliente responde | sino no menu lateral |
| Reuniões e ata com IA | aba Reuniões do cliente |
| Financeiro e inadimplentes | `/w/[slug]/financeiro` |

Atalhos: ⌘K ou `/` busca, `C` nova tarefa, `E` nova entrega, `G` `H` Hoje, `G` `C` clientes.

## Arquitetura

Detalhes e decisões em [`docs/decisions.md`](docs/decisions.md).

- `src/features/<feature>`: componentes, `actions.ts` (server actions), `queries.ts`, `schemas.ts` (Zod).
- `src/lib/supabase`: `client.ts` (browser), `server.ts` (RSC e actions), `admin.ts` (service role, só servidor), `proxy.ts` (renovação de sessão).
- **Multi-tenant:** todo dado de negócio tem `workspace_id`. RLS em todas as tabelas via `is_workspace_member(workspace_id)` e `has_workspace_role(workspace_id, roles[])`, ambas `security definer` com `search_path` vazio. Rotas em `/w/[slug]/...`; o último workspace usado fica em `profiles.last_workspace_id`.
- **Limites de plano:** tabela `plan_limits`, validados por trigger no banco e exibidos na tela de configurações. Plano alterado manualmente no banco.
- **Testes de banco:** `supabase/tests/*.test.sql` (pgTAP) cobrem isolamento entre workspaces em todas as tabelas, papéis, limites de plano (2º membro e 3º cliente no free), idempotência do `generate_month`, Storage, portal (anon sem acesso) e grants de funções.
- **Portal do cliente:** sem login e sem abrir RLS para `anon`. O servidor valida o token e usa o service role; a escrita passa por `portal_respond()`, executável só pelo `service_role`.
- **IA:** `src/features/meetings/ai.ts` chama a API da Anthropic só no servidor, com structured outputs validados por Zod. Modelo em `ANTHROPIC_MODEL`.
- **Storage:** bucket privado `midia`, caminhos `{workspace_id}/{client_id}/{deliverable_id}/arquivo`, URLs assinadas na leitura.
