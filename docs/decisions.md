# Decisões

Registro curto de escolhas feitas quando a especificação deixava margem. Mais recentes no fim.

## 2026-10-27 · Fase 0

- **Next.js 16.4 sem Cache Components.** O template novo liga `cacheComponents` e `partialPrefetching`. Quase toda tela do app depende da sessão e do workspace, então o ganho é pequeno e a complexidade (Suspense obrigatório em toda leitura de cookie) é grande. Desligado; dá para reavaliar depois.
- **`proxy.ts` no lugar de `middleware.ts`.** No Next 16 o middleware foi renomeado para proxy. Ele só renova a sessão do Supabase e redireciona visitantes não logados para `/login`. A autorização real fica no RLS e nas server actions.
- **Supabase CLI como devDependency** (`pnpm exec supabase ...`), para não depender de instalação global.
- **Env validada com Zod.** Variáveis públicas são validadas no carregamento; as de servidor (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_*`) só quando usadas, em `src/lib/env.server.ts`, que importa `server-only`.
- **Modelo padrão no `.env.example`:** `claude-sonnet-5-5`, trocável via `ANTHROPIC_MODEL`.
