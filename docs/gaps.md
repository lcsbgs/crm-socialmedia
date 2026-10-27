# Auditoria do MVP

Data: 2026-10-27. Base: commit `8e43574` (Fase 6).

Legenda: **Existe** = funciona e foi testado. **Parcial** = funciona, mas falta parte do escopo ou do novo pedido. **Falta** = não implementado.

## Situação do banco

| Ambiente | Migrations |
|---|---|
| Local | 9 migrations (Fases 1 a 6), 101 testes pgTAP passando |
| Remoto (`dsfgrcdtczbkdkciwjaa`) | Só Fases 1 e 2. Fases 3 a 6 (`deliverables`, `approvals`, `meetings`, `scope_finance`) **não aplicadas** |

Consequência: hoje o app em produção quebraria nas telas de entregas, portal, reuniões, escopo e financeiro. Nenhuma migration nova será aplicada no remoto sem sua confirmação.

## Resumo por área

| Área | Estado | Observação curta |
|---|---|---|
| Auth | Parcial | Falta "esqueci minha senha" e edição de perfil |
| Workspaces e equipe | Parcial | Falta trocar papel de membro na UI e transferir posse |
| Planos e limites | Existe | Banco e UI |
| Clientes | Parcial | Sem cor, sem busca/filtro, cabeçalho sem próximo vencimento e sem ações |
| Pacotes e generate_month | Parcial | Gera **tarefas-checkbox**, não slots de entrega (Passo 4 muda isso) |
| Tela Hoje | Parcial | Agrupada por cliente, não por seção; poucas ações inline |
| Entregas e kanban | Parcial | Só por cliente; sem visão geral, filtros, calendário, responsável, comentários |
| Calendário | Falta | Nenhuma visão de calendário |
| Portal do cliente | Parcial | Funciona; sem marca do workspace, sem histórico, sem notificação in-app |
| Reuniões e ata com IA | Parcial | Fluxo completo, mas a chamada real à Anthropic nunca foi testada (sem chave) |
| Escopo extra | Existe | Cobrar não gera cobrança (decisão registrada) |
| Financeiro | Parcial | Sem criar ou editar cobrança avulsa; histórico por cliente existe |
| Linha do tempo | Existe | View única com todas as fontes |
| Design system e shell | Falta | Nada do pedido novo existe ainda |
| Atalhos e ⌘K | Falta | |
| Notificações in-app | Falta | Sem tabela nem UI |

## Detalhe

### Auth
- **Existe:** cadastro com nome, login por senha, magic link (PKCE via `/auth/callback`), logout, proxy que protege rotas, onboarding em duas etapas (nome do negócio; primeiro cliente e pacote).
- **Falta:** recuperação de senha; tela de perfil (nome, avatar). `profiles.avatar_url` existe e não é usado.

### Workspaces e equipe
- **Existe:** workspace pessoal automático, criar, renomear, trocar (seletor no topo), último workspace lembrado, convite por link com expiração e e-mail fixo, aceitar, listar e remover membros, sair, excluir (só owner), limites contando convites pendentes.
- **Parcial:** a policy permite trocar papel (admin/membro), mas não há UI.
- **Falta:** transferir posse do workspace; envio de e-mail do convite (fora do MVP por decisão).

### Clientes
- **Existe:** lista com status, pacote, valor e próximo vencimento; cadastro e edição completos (contatos, links, briefing, tom de voz); exclusão; ficha com abas Visão geral, Entregas, Reuniões, Financeiro, Escopo e Linha do tempo.
- **Parcial:** cabeçalho da ficha não mostra próximo vencimento nem tem Nova entrega ou Nova reunião; abas via `?aba=`.
- **Falta:** `clients.cor` (cor do cliente); busca e filtro na lista; aba Calendário; resumo do mês na visão geral.

### Pacotes e generate_month
- **Existe:** CRUD de pacotes com itens (tipo, quantidade, cadência); `generate_month` idempotente, testado, com pg_cron comentado; botão Gerar mês.
- **Diverge do novo pedido:** gera tarefas recorrentes (`tasks` com origem `template`) em vez de slots de entrega. Cadência diária (ex.: Stories) gera cerca de 22 itens por cliente por mês.

### Tela Hoje
- **Existe:** tarefas de hoje e atrasadas, aprovações paradas há mais de 2 dias, cobranças vencendo em 3 dias ou atrasadas, reuniões do dia, criação rápida de tarefa, concluir tarefa.
- **Parcial:** agrupada por cliente (pedido novo: seções por tipo); datas absolutas; inputs nativos.
- **Falta:** adiar para amanhã, abrir em painel, Marcar como paga e Cobrar no WhatsApp direto na linha, Reenviar link de aprovação, atalho C, empty state útil.

### Entregas e kanban
- **Existe:** kanban por cliente com 5 colunas, arrastar e soltar (mouse, toque, teclado), ordem fracionária, criar entrega, editor em diálogo (título, formato, etapa, data, legenda), upload para bucket privado com URL assinada, remover mídia, excluir com confirmação, respostas do cliente no editor.
- **Falta:** kanban de todos os clientes; filtros por cliente, formato e responsável; `deliverables.responsavel_id`; mudar data no cartão; visão de semana e calendário; painel lateral (hoje é diálogo); comentários (sem tabela); histórico próprio da entrega; botão Enviar para aprovação.

### Portal do cliente
- **Existe:** `/p/[token]` sem login e sem RLS para anon, service role no servidor, `portal_respond()` só para service_role, aprovar e pedir ajuste com comentário obrigatório, nome lembrado, novo link invalida o anterior, copiar link e WhatsApp na ficha.
- **Falta:** marca do workspace (logo ou cor); histórico do que já foi aprovado; notificação in-app para a equipe quando o cliente responde.

### Reuniões e ata com IA
- **Existe:** criar reunião, anotações, gerar ata com structured outputs e Zod, revisar (editar e desmarcar passos), confirmar criando tarefas com origem `ata`, proteção contra duplo clique, reuniões do dia na Hoje.
- **Não verificado:** chamada real à API (sem `ANTHROPIC_API_KEY` local).
- **Falta:** reuniões no calendário; editar ata depois de confirmada.

### Escopo extra
- **Existe:** registrar pedido com valor sugerido, cobrado, absorvido ou reaberto, totais, linha do tempo.

### Financeiro
- **Existe:** página por mês com previsto, recebido, em aberto e atrasado; marcar como pago e desfazer; WhatsApp com tom de lembrete ou de cobrança; inadimplentes de todos os meses; histórico por cliente na ficha.
- **Falta:** criar ou editar cobrança avulsa (ex.: valor do escopo cobrado, desconto).

### Design, shell e UX (pedido novo, Passos 2 e 3)
- **Existe hoje:** Tailwind com tokens básicos, Geist, header com abas no topo, `<details>` como menu, `<dialog>` nativo, Alert, Badge, Card, Field.
- **Falta tudo do pedido:** tokens novos e dark mode, Hanken Grotesk e tabular-nums, Radix (Popover, Dialog, Sheet, Tooltip, Select), DatePicker próprio, Toast, Skeleton, EmptyState, Kbd, Avatar; sidebar colapsável e drawer no mobile; painel de detalhe à direita; ⌘K (cmdk); atalhos; datas relativas; `loading.tsx` e `error.tsx`.
- **Microcopy fora do padrão pedido:** plurais com "(s)" em vários textos ("tarefa(s)", "cliente(s)"), rótulo em caixa alta no portal ("LEGENDA").

### Qualidade
- **Existe:** 101 testes pgTAP (isolamento em todas as tabelas, limites, idempotência, Storage, portal, guarda de grants), typecheck, lint, build.
- **Falta:** testes de interface ou e2e.

## Mudanças de schema necessárias para os Passos 2 a 7

Todas como migrations novas, testadas só no local:

1. `clients.cor` (paleta fixa de 10 tons, preenchida automaticamente).
2. Slots de entrega: `deliverables` ganha `competencia`, `slot_key` (idempotência) e título opcional enquanto for rascunho; `generate_month` passa a criar entregas em vez de tarefas.
3. `deliverables.responsavel_id` (membro do workspace).
4. `deliverable_comments` (comentários da equipe).
5. `notifications` (in-app, por usuário e workspace) com trigger quando o cliente responde no portal.
6. Marca do workspace para o portal (ex.: `workspaces.cor` e `workspaces.logo_path`).
7. Opcional: `payments` aceitar cobrança avulsa (`origem`), para criar cobranças manuais.

## Decisões que preciso de você antes do Passo 2

1. **Migrations pendentes no remoto (Fases 3 a 6):** sigo empilhando migrations novas por cima delas (o caminho mais seguro), certo?
2. **Tarefas recorrentes já geradas** (origem `template`): no novo `generate_month` elas deixam de ser criadas. Removo as existentes numa migration, ou deixo como histórico?
3. **Cadência diária (Stories):** viram cerca de 22 slots por cliente por mês. Gero mesmo assim, ou cadência diária fica como uma entrega semanal agrupada ("Stories da semana")?
