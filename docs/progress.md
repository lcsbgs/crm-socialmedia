# Progresso

## Como retomar
Leia este arquivo, depois `docs/gaps.md` e o fim de `docs/decisions.md`. Rode `scripts/db-test-local.sh` para testar o banco e `pnpm typecheck && pnpm lint && pnpm test && pnpm build` para o app.

## Fase 0: auditoria (concluída)
- Feito: `docs/gaps.md` com módulos, schema x modelo, problemas visuais e riscos; harness de banco local; telas em `docs/design/`.
- Problemas abertos: projeto remoto `dsfgrcdtczbkdkciwjaa` ainda subindo (`COMING_UP`), não deu para listar migrações aplicadas.
- Próxima: Fase 1, design system e casca.

## Fase 1: design system e casca (concluída)
- Feito: tokens e fontes, componentes em `src/components/ui`, sidebar e barra superior do design, rotas novas com redirecionamento das antigas, varredura de classes antigas nas telas, vitest.
- Falta: conferir visualmente telas logadas (o projeto remoto não respondia durante a fase); refazer telas específicas acontece nas fases seguintes.
- Problemas abertos: banco remoto em `COMING_UP`, sem acesso SQL.
- Próxima: Fase 2, autenticação, workspaces, convites e onboarding.

## Fase 2: autenticação, equipe, convites e onboarding (concluída no código)
- Feito: migração `20261106100000_team_access.sql` com 16 testes novos; login, consentimento simulado, fluxo ChatGPT, onboarding em 3 passos, convite, Equipe; adapter de e-mail; `docs/oauth-setup.md` e `.env.example` completos.
- Falta: aplicar as migrações no remoto (projeto estava pausado; pedi a reativação e ele está subindo). Regenerar `src/types/database.ts` do remoto depois disso (hoje ajustado à mão com `scripts/types_patch.py`).
- Próxima: Fase 3, Em pauta hoje.

## Fase 3: Em pauta hoje (concluída)
- Feito: migração `20261106110000_daily_agenda.sql`, `src/features/today/{agenda,greeting}.ts` com testes, tela nova, componentes antigos da Hoje removidos.
- Falta: seletor de responsável no diálogo de nova tarefa.
- Próxima: Fase 4, clientes.

## Fase 4: clientes (concluída)
- Feito: migração `20261106120000_client_hub.sql` (estratégia, kit, arquivos, timeline_events, briefing, checklist, acesso a mídia por cliente), página do cliente refeita, páginas públicas de briefing e kit.
- Falta: aba Relatórios (Fase 12).
- Próxima: Fase 5, pacotes e planejamento.

## Fase 5: pacotes e planejamento (concluída)
- Feito: migração `20261106130000_planning.sql`, calendário editorial novo, pergunta de escopo extra, preço e rodadas no pacote.
- Problemas abertos: o projeto remoto voltou a `INACTIVE` depois da primeira reativação; pedi de novo. Nenhuma migração desta rodada foi aplicada no remoto ainda.
- Próxima: Fase 6, posts e IA.

## Fase 6: posts e IA (concluída)
- Feito: migração `20261106140000_posts_ai.sql`, quadro e editor do post, camada de IA, Ajustes > IA.
- Falta: `/api/ai/chatgpt/callback` real (depende das credenciais da OpenAI); botões Canva e Drive do editor apontam para as telas da Fase 9.
- Problemas abertos: remoto em `COMING_UP` de novo (segunda reativação).
- Próxima: Fase 7, portal do cliente.
