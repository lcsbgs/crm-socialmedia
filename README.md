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
pnpm exec supabase db push --dry-run   # confira o que será aplicado
pnpm exec supabase db push
pnpm db:types:remote
```

## Arquitetura

Detalhes e decisões em [`docs/decisions.md`](docs/decisions.md).

- `src/features/<feature>`: componentes, `actions.ts` (server actions), `queries.ts`, `schemas.ts` (Zod).
- `src/lib/supabase`: `client.ts` (browser), `server.ts` (RSC e actions), `admin.ts` (service role, só servidor), `proxy.ts` (renovação de sessão).
- **Multi-tenant:** todo dado de negócio tem `workspace_id`. RLS em todas as tabelas via `is_workspace_member(workspace_id)` e `has_workspace_role(workspace_id, roles[])`, ambas `security definer` com `search_path` vazio. Rotas em `/w/[slug]/...`; o último workspace usado fica em `profiles.last_workspace_id`.
- **Limites de plano:** tabela `plan_limits`, validados por trigger no banco e exibidos na tela de configurações. Plano alterado manualmente no banco.
- **Testes de banco:** `supabase/tests/*.test.sql` (pgTAP) cobrem isolamento entre workspaces, papéis, limites e grants.
