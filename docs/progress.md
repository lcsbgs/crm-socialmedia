# Progresso

## Resumo da rodada (2026-11-07)

**Pronto (fases 0 a 13, todas commitadas):** design system e casca do design; login por e-mail e Google/Apple/ChatGPT em demonstração (estrutura real pronta); equipe com papéis, clientes atribuídos e convites com lugar em espera; onboarding em 3 passos; Em pauta hoje com saudação e 4 blocos; página do cliente com estratégia, kit, arquivos, briefing e linha do tempo; pacotes, geração do mês e calendário; produção com editor completo e IA (Anthropic, ChatGPT e demonstração); portal do cliente; publicação na Meta com fila; Google, Granola e Canva; comercial com propostas e contratos; financeiro com Asaas e NFS-e; relatórios mensais; busca ⌘K e resumo diário.
**Qualidade:** 19 arquivos de teste de banco (234 asserções, incluindo isolamento entre espaços e membro sem financeiro), 45 testes de TypeScript, typecheck, lint e build verdes; nenhum segredo nos bundles do navegador; seed com 10 clientes e 290 posts responde em menos de 15 ms.
**Integrações:** todas em modo demonstração (`INTEGRATIONS_MODE=mock`), com selo "modo demonstração" e a estrutura real marcada com `TODO(oauth-setup)` (18 pontos).

**Pendente e por quê:**
- **Banco remoto migrado pela metade**: o projeto estava pausado; ao voltar, apliquei 5 migrações e a 6ª parou porque o Supabase pediu confirmação humana (um `drop function` e um `delete`, sem efeito num banco vazio). Faltam `20261028110000` em diante. Passo a passo em `docs/beta-checklist.md`.
- **Tipos do banco ajustados à mão** (`scripts/types_patch.py`) porque não havia como gerá-los aqui; regenerar com `pnpm db:types:remote` depois de migrar.
- **Telas logadas sem conferência visual** neste ambiente (sem backend de autenticação funcionando); o login foi conferido e bate com o design.
- **Depende de credenciais**: OAuth real de todos os provedores, revisão do app na Meta, Google Picker, descoberta OAuth do Granola, cadastro fiscal no Asaas, ZIP no fechamento do contador.

**Decisões mais importantes** (detalhes em `docs/decisions.md`): `docs/spec.md` não existe, então segui as telas e o pedido; nomes de tabela antigos mantidos (só migrações aditivas); membro só vê clientes atribuídos e nunca o financeiro nem o comercial; limite de lugares vale no aceite, não no convite; tokens de terceiros cifrados com AES-256-GCM e sem leitura pela API; IA com interface única e queda para créditos; fila de publicação no banco com backoff; contrato assinado vira cliente no banco; PDFs pela impressão do navegador.

**Ao voltar:** (1) migrar o remoto (`docs/beta-checklist.md`, seção 1) e rodar `pnpm db:types:remote`; (2) preencher `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY` e `CRON_SECRET`; (3) criar os jobs com `pg_net` (seção 3); (4) conferir as telas logadas com o seed; (5) configurar as integrações aos poucos com `docs/oauth-setup.md` e trocar para `INTEGRATIONS_MODE=real`; (6) revisar e fazer merge do pull request.

---

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

## Fase 7: portal do cliente (concluída)
- Feito: migração `20261107100000_portal.sql`, portal refeito, envio do planejamento e aprovação tácita na página do cliente, rota de job.
- Banco remoto: o projeto voltou (`ACTIVE_HEALTHY`) e estava vazio (0 usuários). Apliquei pelo MCP: deliverables, approvals, meetings, scope_finance, client_color. **Parou em `deliverable_slots`**: o servidor do Supabase pediu confirmação humana (a migração tem `drop function` e `delete`, sem efeito num banco vazio) e não houve resposta. Faltam aplicar, nesta ordem: deliverable_slots (sem a view, recriada depois), deliverable_activity, notifications_brand e todas as `202611*`. Ver `docs/beta-checklist.md`.
- Próxima: Fase 8, publicação Meta.

## Fase 8: publicação Meta (concluída)
- Feito: migrações `20261107110000_meta_publishing.sql` e `20261107120000_integrations.sql`, adapter, fila, rotas OAuth e jobs, telas.
- Falta: agendar `/api/jobs/publicar` (a cada minuto) e `/api/jobs/renovar-tokens` (diário) no pg_cron + pg_net, que depende da URL do app e do `CRON_SECRET` (ver beta-checklist). Métricas de insights ficam para a Fase 12.
- Próxima: Fase 9, integrações Google, Granola e Canva.

## Fase 9: integrações Google, Granola e Canva (concluída em modo demonstração)
- Feito: migração `20261107130000_meetings_integrations.sql`, adapters, rotas OAuth, telas simuladas, brief, app do Canva.
- Falta (depende de credenciais): Google Picker, renovação do token do Google, descoberta OAuth do Granola.
- Próxima: Fase 10, comercial.

## Fase 10: comercial (concluída)
- Feito: migração `20261107140000_sales.sql`, funil, editor de proposta, páginas públicas `/pr` e `/ct`, adapter de assinatura e webhook, sinais na Em pauta hoje.
- Próxima: Fase 11, financeiro.

## Fase 11: financeiro (concluída)
- Feito: migração `20261107150000_finance.sql`, `src/lib/billing`, tela nova, webhook e job.
- Falta: anexos (ZIP) no fechamento; configuração fiscal do Asaas (serviço municipal) é TODO.
- Próxima: Fase 12, relatórios e acabamento.

## Fase 12: relatórios e acabamento (concluída)
- Feito: migração `20261107160000_reports.sql`, métricas, relatórios, busca, resumo diário, Minha conta.
- Próxima: Fase 13, revisão final.

## Fase 13: revisão final (concluída)
- Feito: teste de isolamento entre espaços em todas as tabelas novas (`18_cross_workspace`), checagem de segredos nos bundles, seed de demonstração com 10 clientes e 290 posts, medição de consultas como membro (menos de 15 ms), conferência visual do login (desktop e celular, sem rolagem lateral), `docs/beta-checklist.md`.
- Pendente: revisão visual das telas logadas e auditoria de acessibilidade com ferramenta (ver checklist).
