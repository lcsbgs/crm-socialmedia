# Auditoria: do MVP atual ao Pauta

Data: 2026-11-06. Base: commit `6a526ba` (Passo 7 + docs corrigidos).

Fontes usadas: `CLAUDE.md`, `docs/design/README.md` e as 12 telas em `docs/design/`. O arquivo `docs/spec.md` citado no CLAUDE.md **não existe no repositório**. O comportamento foi inferido das telas, do pedido desta rodada e das decisões anteriores (ver `docs/decisions.md`, 2026-11-06).

Legenda: **Existe** funciona hoje. **Parcial** funciona, mas falta parte. **Falta** não existe.

## 1. Situação de ambiente

| Item | Estado |
|---|---|
| Next.js 16.4, React 19.3, Tailwind 4 (tokens em `@theme` no `globals.css`, não há `tailwind.config`) | Existe |
| Typecheck, lint e build | Passam no commit base |
| Testes pgTAP (9 arquivos, 123 asserções) | Passam num Postgres 16 local com esqueleto do Supabase (`scripts/db-test-local.sh`) |
| Testes de TypeScript (unidade) | Falta: não há runner. Entra vitest na Fase 1 |
| `supabase start` | Bloqueado neste ambiente (registro de imagens fora da rede). Substituído pelo script acima |
| Projeto Supabase remoto `dsfgrcdtczbkdkciwjaa` | Estava subindo (`COMING_UP`) no início da auditoria; histórico diz que só Fases 1 e 2 foram aplicadas |

## 2. Por módulo

| Módulo (rota do design) | Estado | O que existe | O que falta | Arquivos |
|---|---|---|---|---|
| Design system | Parcial | Tokens próprios (vinho `#8e2f6b`, Hanken Grotesk), Radix (Dialog, Popover, Select, Tooltip, Dropdown), sonner, cmdk | Tokens do README (violeta `#6B4EFF`, fundo `#F4F5F7`, raio 24 nos cards, pílulas), Bricolage Grotesque + Figtree, Button em pílula 36/44/52 com variantes primária/borda/escura/tonal, IconButton, Tag de cliente, AvatarStack, Tabs, SegmentedControl, Checkbox, Radio card, ProgressBar, Drawer | `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/*` |
| Casca (Main.dc.html) | Parcial | Sidebar recolhível, drawer no mobile, ⌘K, sino de notificações | Seletor de workspace em cartão, botão **Novo** em pílula, navegação com contadores (Em pauta hoje, Aprovações), itens Reuniões, Comercial, Relatórios, lista de clientes com quadrado colorido, rodapé Pacotes e Ajustes; barra superior com busca larga, Minha pauta/Pauta do time, avatares da equipe | `src/components/shell/*` |
| Login (/login) | Parcial | E-mail e senha, link mágico, cadastro em `/cadastro` | Layout em duas colunas do design, abas Criar conta/Entrar, botões ChatGPT, Google e Apple (modo mock), texto de convite | `src/app/(auth)/*`, `src/features/auth/*` |
| Onboarding (3 telas) | Parcial | Uma tela `/onboarding` (nome e negócio) e `/w/[slug]/comecar` (primeiro cliente) | Três passos com indicador e "Pular por agora": espaço e equipe (logo, modo de trabalho, convites), IA (ChatGPT ou créditos), primeiro cliente (pacote, responsáveis, contas Meta) | `src/app/onboarding`, `src/app/w/[slug]/comecar` |
| Convite (/convite/[token]) | Parcial | Aceite com o mesmo e-mail | Visual do design com papel e clientes atribuídos, entrar com qualquer provedor, `client_ids` no convite | `src/app/convite/[token]`, `src/features/workspaces` |
| Ajustes > Equipe | Parcial | Convidar, listar, remover em `/configuracoes` | Navegação de Ajustes (Estúdio, Equipe, Plano, Integrações, IA e ChatGPT, Minha conta), tabela com papel editável, clientes por pessoa, coluna IA, lugares do plano, convite esperando lugar | `src/app/w/[slug]/configuracoes` |
| Em pauta hoje (/w/[slug]) | Parcial | Seções, tarefas, aprovações paradas, cobranças, reuniões, criação rápida | Saudação sorteada, frase-resumo com pílulas, 4 blocos do design, Minha pauta/Pauta do time, Feito hoje, função `getDailyAgenda` testada | `src/features/today/*` |
| Clientes (/clientes/[id]) | Parcial | Registro com cor, resumo do mês, contatos, briefing, abas | Cabeçalho do design (pacote, vencimento, contas, responsáveis, 3 ações), abas Estratégia, Arquivos, Relatórios; kit da marca; checklist de onboarding; briefing público por token; `timeline_events` | `src/app/w/[slug]/clientes`, `src/features/clients` |
| Pacotes e planejamento | Parcial | CRUD de pacotes, `generate_month` idempotente criando slots | pg_cron ligado, aviso de limite do pacote virando escopo extra, "Planejar dezembro" | `src/features/packages`, migration `deliverable_slots` |
| Calendário (/calendario) | Parcial | Semana com arrastar, mês com reuniões | Visual do design (grade do mês com cartões por cliente e estado), visão Lista, contagem "58 posts em 5 clientes" | `src/app/w/[slug]/calendario`, `src/features/deliverables/components/month-calendar.tsx` |
| Produção (/producao) | Parcial | Kanban em `/entregas` com 5 colunas, painel lateral, comentários, histórico | Rota `/producao`, colunas do design (Planejado, Em produção, Em aprovação, Ajuste pedido, Agendado), editor com Arte (Canva, Drive, upload), ações de IA na legenda, pilar, rodadas, checklist, versões, pré-visualização | `src/features/deliverables/*` |
| IA | Parcial | Ata de reunião com Anthropic (`src/features/meetings/ai.ts`) | Camada `src/lib/ai` com provedores Anthropic e ChatGPT (mock), `ai_usage`, limites por plano, prompts versionados, tarefas de legenda | `src/features/meetings/ai.ts` |
| Portal (/p/[token]) | Parcial | Aprovar e pedir ajuste, marca do workspace, nome lembrado | Visual mobile do design (um post por vez, 1 de 3, Aprovar os 3), ponto na imagem, IP e versão na resposta, planejamento do mês aprovável, lembrete 48h, aprovação tácita, limite de rodadas | `src/app/p/[token]`, `src/features/portal` |
| Publicação Meta | Falta | Nada | Tudo: conexões, descoberta de contas, adapter, fila `publish_jobs`, `published_posts`, doc de app review | - |
| Integrações (Google, Granola, Canva) | Falta | Nada | Tudo, em modo mock | - |
| Comercial | Falta | Nada | Funil, propostas, contratos, assinatura | - |
| Financeiro (/financeiro) | Parcial | Recebimentos do mês, marcar pago, WhatsApp, inadimplentes | Abas Notas fiscais, Despesas, Rentabilidade, Contador; cobrança avulsa; adapter de cobrança (manual e Asaas mock); NFS-e; cobrança automática | `src/features/finance` |
| Relatórios | Falta | Nada | Métricas, relatório mensal, PDF | - |
| Notificações | Parcial | Tabela, trigger quando o cliente responde, sino | Mais tipos (publicação falhou, proposta aberta, pagamento) | `src/features/notifications` |
| Busca ⌘K | Parcial | Paleta com clientes e entregas | Reuniões, propostas | `src/components/shell/command-palette.tsx`, `src/features/search` |

## 3. Schema atual x modelo do Pauta

Princípio: **nenhuma tabela com dados é renomeada nem apagada.** Onde o nome do modelo novo difere, a tabela atual é mantida e o nome novo vira só vocabulário (registrado em decisions.md).

| Modelo do Pauta | Hoje | Plano de migração (só aditivo) |
|---|---|---|
| `workspaces` | Existe (`nome`, `slug`, `plano`, `logo_path`) | Adicionar `modo_trabalho`, `ai_mode`, `onboarding_step` |
| `workspace_members` (owner, admin, member) | Existe | Sem mudança |
| `invites` | `invitations` (e-mail, papel, token, expira) | Manter `invitations`; adicionar `client_ids uuid[]`; validade de 7 dias no default |
| `client_assignees` | Falta | Criar; backfill: todo membro existente fica atribuído a todos os clientes atuais (ninguém perde acesso) |
| `clients` | Existe (com `cor`, `portal_token`) | Adicionar `onboarding_checklist jsonb`, `briefing_token`, `drive_folder_id`, `instagram_handle` |
| Estratégia | Falta | `client_strategies` (objetivo, pilares jsonb, formatos, decisões) |
| Kit da marca | Parcial (`tom_de_voz`) | `brand_kits` (cores, tom, palavras proibidas, `share_token`) + bucket `brand` |
| `timeline_events` | View `client_timeline` | Criar tabela para eventos novos e incluir na view (a view continua sendo a leitura) |
| Posts | `deliverables` (status `planejar`..`publicado`) | Manter `deliverables`; adicionar etapas `ajuste` e `agendado` ao enum (aditivo), `pilar`, `prazo_interno`, `rodadas`, `checklist`, `canal`, `horario` |
| Versões do post | Falta | `deliverable_versions` |
| `approval_responses` | `approvals` (decisão, comentário, autor) | Manter `approvals`; adicionar `ip`, `versao`, `ponto jsonb` |
| `scope_requests` | Existe | Adicionar `deliverable_id`, `origem` |
| Pacotes | `package_templates.itens jsonb` | Adicionar `preco`, `limite_rodadas` |
| `ai_usage`, `ai_connections` | Falta | Criar |
| `social_connections`, `social_accounts`, `publish_jobs`, `published_posts` | Falta | Criar (Fase 8) |
| `integration_connections` (Google, Granola, Canva) | Falta | Criar (Fase 9), tokens cifrados |
| Comercial: `leads`, `proposals`, `proposal_views`, `contracts` | Falta | Criar (Fase 10) |
| Financeiro: `payments` | Existe | Adicionar `origem`, `metodo`, `provider_id`, `boleto_url`, `pix_code`, `nfse_*`; criar `expenses`, `invoices`, `accounting_closings` |
| Relatórios: `metrics_daily`, `reports` | Falta | Criar (Fase 12) |

## 4. Problemas visuais comparados a docs/design

- Cor primária vinho e fonte Hanken Grotesk; o design pede violeta `#6B4EFF`, Bricolage Grotesque nos títulos e Figtree no texto.
- Botões retangulares de 32px; o design usa pílula (999px) com 36, 44 e 52.
- Cards com raio pequeno e sombra; o design pede raio 24, sem sombra, separação por fundo `#F4F5F7`.
- Sidebar sem botão Novo, sem contadores, sem bloco de clientes com quadrado colorido.
- Título da Hoje é texto pequeno; o design tem saudação violeta e H1 de 44px com pílulas coloridas.
- Rotas divergem: `/entregas` (design: `/producao`), `/configuracoes` (design: `/ajustes/equipe`).
- Dark mode existe mas o design é só claro (decisão: manter claro, ver decisions.md).

## 5. Riscos

| Risco | Gravidade | Onde | Plano |
|---|---|---|---|
| ~~Membro vê todos os clientes e todo o financeiro~~ (resolvido na Fase 2; `valor_mensal` segue legível no banco) | Baixa | Policies `"payments: membros"`, `"clients: membros"` | Fase 2: `client_assignees`, policy de clientes por atribuição, financeiro só owner/admin |
| Migrations das Fases 3 a 7 possivelmente não aplicadas no remoto | Alta | Projeto `dsfgrcdtczbkdkciwjaa` | Conferir `supabase_migrations.schema_migrations` e aplicar as pendentes, só aditivas, antes da Fase 1 de banco |
| Service role usada no portal | Média (correto, mas sensível) | `src/lib/supabase/admin.ts` com `server-only` | Manter; revisar na Fase 13 |
| Segredos no cliente | Nenhum encontrado | Só `NEXT_PUBLIC_SUPABASE_URL` e a chave anônima vão ao navegador | Revisar a cada fase |
| Duplicação de componentes | Baixa | `submit-button`, `field`, `textarea-field` sobrepostos a Input/Textarea | Unificar na Fase 1 |
| Tokens de terceiros | Ainda não existem | - | Cifrar com AES-GCM no servidor (`ENCRYPTION_KEY`) a partir da Fase 6 |
| Sem testes de TypeScript | Média | - | vitest na Fase 1 |

## 6. Atualizações por fase

(Cada fase acrescenta uma linha aqui.)

| Fase | Data | Resumo |
|---|---|---|
| 0 | 2026-11-06 | Auditoria criada; telas movidas para `docs/design/`; CLAUDE.md na raiz |
| 1 | 2026-11-06 | Design system: tokens, Bricolage + Figtree, Button/IconButton em pílula, Card 24, Tag, Avatar/AvatarStack, Tabs, SegmentedControl, Checkbox, RadioCard, ProgressBar, SegmentedBar, Drawer, EmptyState, DemoBadge. Casca do Main.dc.html (sidebar com seletor, Novo, contadores, clientes; barra com busca, Minha pauta/Pauta do time, sino, equipe). Rotas `/producao`, `/aprovacoes`, `/reunioes`, `/comercial`, `/relatorios`, `/ajustes/*`. vitest. Falta: comparação visual com login (banco remoto indisponível durante a fase) |
| 2 | 2026-11-06 | `client_assignees`, acesso por papel (membro só clientes atribuídos, financeiro só owner/admin), convites com clientes e lugar em espera, `profiles.email`. Login redesenhado com ChatGPT/Google/Apple em modo demonstração e estrutura real (Supabase OAuth, ChatGPT PKCE), link mágico e senha em desenvolvimento. Onboarding em 3 passos, Convite e Ajustes > Equipe do design. Adapter de e-mail. `docs/oauth-setup.md`. Risco resolvido: membro via todo o financeiro |
| 3 | 2026-11-06 | Em pauta hoje do design: saudação sorteada sem repetir, frase-resumo com pílulas, 4 blocos com ação ao lado, Minha pauta/Pauta do time, Feito hoje, estado vazio. `getDailyAgenda` + `buildDailyAgenda` com 8 testes; `tasks.responsavel_id`, `deliverables.hora_publicacao`. Falta: escolher responsável na criação de tarefa |
| 4 | 2026-11-06 | Página do cliente do design: cabeçalho com pacote, vencimento, Instagram, Drive, responsáveis e 3 ações; abas do design; Visão geral com mês até agora, checklist de onboarding, estratégia com pilares em barra segmentada, kit da marca, linha do tempo e contatos; Estratégia completa (objetivo, metas, pilares, formatos, decisões); Arquivos com kit da marca, upload no Storage, link só leitura `/k/[token]`, briefing público `/b/[token]`; Linha do tempo com notas (`timeline_events`). 9 testes novos |
| 5 | 2026-11-06 | Pacote com preço e limite de rodadas; `package_month_status`; post além do pacote pergunta se vira escopo extra; `generate_month_all` + `pg_cron`; calendário do design (mês com chips por estado, semana, lista, filtro de clientes, legenda, arrastar para mudar data, Planejar o próximo mês). 7 testes novos, incluindo não duplicar |
| 6 | 2026-11-06 | Etapas Ajuste pedido e Agendado; quadro de Produção do design (6 colunas com cor, cartões com etiqueta do cliente, miniatura, atraso); editor do post completo no painel lateral; versões (`deliverable_versions`); camada `src/lib/ai` com Anthropic, ChatGPT (estrutura real + simulado) e demonstração, roteamento com queda para créditos, `ai_usage`, créditos por plano, tokens cifrados; Ajustes > IA e ChatGPT; rascunho de estratégia com IA; ata de demonstração. 9 testes de banco, 10 de TypeScript. Falta: callback real do OAuth de uso do ChatGPT (TODO) |
| 7 | 2026-11-07 | Portal do design (mobile, um post por vez, carrossel, legenda com "mais", Aprovar, Pedir ajuste com ponto na imagem, Aprovar todos, nome lembrado), respostas com IP/versão/ponto, planejamento do mês aprovável (`month_plans`), lembrete 48 h e aprovação tácita (`run_approval_reminders` + pg_cron + `/api/jobs/lembretes`), rodadas além do limite viram sugestão de escopo extra. 13 testes novos |
| 8 | 2026-11-07 | Publicação Meta: conexões cifradas, contas por cliente, agendar no editor, fila com backoff, `published_posts`, erros legíveis na Em pauta hoje com Reconectar, renovação de tokens, OAuth real (Facebook Login for Business e Business Login for Instagram) e simulado, Ajustes > Integrações, `docs/meta-app-review.md`. 12 testes de banco e 8 da Graph API |
