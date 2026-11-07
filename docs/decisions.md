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

## 2026-10-27 · Fase 3

- **`midia_urls` guarda caminhos do Storage, não URLs.** O bucket `midia` é privado; a UI gera URLs assinadas de 1 h na leitura. Caminho: `{workspace_id}/{client_id}/{deliverable_id}/{8 chars aleatórios}-{nome}`.
- **Upload direto do navegador para o Storage** (sem passar pelo servidor do Next), com policy em `storage.objects` baseada em `can_access_media(name)`: a primeira pasta precisa ser um workspace do qual o usuário é membro. Depois a server action `attachMedia` valida o prefixo do caminho e registra na entrega. Limite de 50 MB e tipos imagem, vídeo (mp4/mov) e PDF definidos no bucket.
- **Ordem no kanban fracionária** (`ordem double precision`): soltar um card grava a média dos vizinhos, sem renumerar a coluna. Atualização otimista; em erro, volta ao estado do servidor.
- **`status_changed_at`** é mantido por trigger e alimenta "aprovação parada há mais de 2 dias" na tela Hoje e a linha do tempo.
- **Drag and drop com `@dnd-kit`**: mouse (arraste após 5 px), toque (segurar 200 ms, para não brigar com a rolagem horizontal) e teclado (Espaço/setas). A etapa também pode ser trocada no editor da entrega, como alternativa acessível.
- **Tela Hoje:** tarefas pendentes com vencimento até hoje, entregas em aprovação há mais de 2 dias e cobranças em aberto vencendo nos próximos 3 dias ou atrasadas, agrupadas por cliente ("Sem cliente" por último). Reuniões do dia entram na Fase 5. Inclui criação rápida de tarefa avulsa.
- **Tarefas viraram feature própria** (`src/features/tasks`), usada pela tela Hoje e pela ficha do cliente.
- **IDs fixos do seed precisam ser UUID válidos (RFC 4122)**, porque o Zod 4 valida a variante.

## 2026-10-27 · Fase 4

- **Portal sem RLS para anon.** `anon` continua sem nenhum grant. `/p/[token]` é renderizado no servidor com o service role (`src/lib/supabase/admin.ts`, `server-only`), sempre filtrando pelo cliente do token. A escrita passa por `portal_respond()`, executável só pelo `service_role`, que valida token, cliente não encerrado, entrega do cliente e etapa `em_aprovacao` dentro de uma transação.
- **Efeito da resposta:** aprovado move a entrega para Aprovado; ajuste volta para Produzir e exige comentário. Responder duas vezes a mesma entrega é recusado (ela sai de Em aprovação).
- **O portal mostra todas as entregas em aprovação do cliente**, não só as do mês corrente: na prática é o que o cliente precisa ver, e evita esconder algo com data de publicação no mês seguinte.
- **Novo link invalida o anterior** (`regenerate_portal_token`), para quando o link vazar ou a pessoa de contato mudar.
- **Mensagem de WhatsApp** usa o primeiro contato do cliente; telefone com 10 ou 11 dígitos ganha DDI 55. Sem telefone, abre o wa.me para escolher o contato.
- **Nome de quem respondeu fica no localStorage** do navegador do cliente, só como conveniência.
- **Sem rate limit no portal no MVP.** O token é um UUID aleatório; se virar problema, adicionar limite por IP no proxy.

## 2026-10-27 · Fase 5

- **Ata com structured outputs** (`client.messages.parse` + `zodOutputFormat`) e uma segunda validação Zod mais estrita antes de salvar. A chamada roda só no servidor (`src/features/meetings/ai.ts`, `server-only`). Modelo vem de `ANTHROPIC_MODEL`; o `.env.example` sugere `claude-opus-5-5`. Sem thinking/effort explícitos, para funcionar com qualquer modelo que você configurar. Não habilitei o fallback de recusa do lado do servidor (é beta e depende do modelo); recusas e respostas truncadas viram mensagem de erro amigável.
- **Fluxo em duas etapas:** "Gerar ata" grava o rascunho em `meetings.ata_ia`; o usuário edita resumo, decisões e próximos passos (pode desmarcar passos) e confirma. A confirmação grava `decisoes`, `ata_confirmada_em` e cria as tarefas com `origem = 'ata'` e `meeting_id`. A confirmação é condicional (`ata_confirmada_em is null`) para um duplo clique não duplicar tarefas; se a criação das tarefas falhar, a confirmação é desfeita.
- **Data da reunião** é digitada como horário de Brasília (`datetime-local` + `-03:00`). O Brasil não tem horário de verão desde 2019.
- **Excluir reunião mantém as tarefas** criadas por ela (FK com `on delete set null (meeting_id)`).
- **Tela Hoje** passou a mostrar as reuniões do dia.
- **Google Calendar fora do MVP.** A estrutura fica preparada em `meetings.data` (timestamptz); a integração entraria como um campo `external_event_id` e um job de sincronização.

## 2026-10-27 · Fase 6

- **Status `atrasado` derivado na leitura** (pendente com vencimento passado) e gravado por `generate_month` e por `mark_overdue_payments()`. Esta última atende todos os workspaces, não é exposta à API e tem o agendamento diário via pg_cron comentado na migration.
- **`pago_em` e `status = 'pago'` andam juntos** (constraint). Desfazer um pagamento volta para pendente ou atrasado conforme o vencimento.
- **Mensagem de cobrança no WhatsApp** muda de tom: lembrete antes do vencimento e cobrança educada depois. Usa o primeiro contato do cliente.
- **Escopo:** pedido extra com valor sugerido e status pendente, cobrado ou absorvido; `resolvido_em` é mantido por trigger. Marcar como cobrado **não** cria cobrança automaticamente (sem gateway nem NF no MVP); a aba mostra o total cobrado e absorvido para dar visibilidade do escopo que escapa.
- **Guarda de grants em teste** (`supabase/tests/00_function_grants.test.sql`): o `alter default privileges` não impede os grants padrão do Supabase em funções novas, então cada migration revoga explicitamente o que cria e esse teste falha se alguma função `security definer` ficar exposta fora da lista prevista. Ele pegou `mark_overdue_payments` e `regenerate_portal_token` nesta fase.

## 2026-10-27 · Refação: auditoria (Passo 1)

Ver `docs/gaps.md`. Decisões tomadas a partir dela:

- **Só migrations novas**, empilhadas sobre as Fases 3 a 6 (que ainda não estão no remoto). Nenhuma migration existente é editada.
- **Tarefas recorrentes antigas** (`origem = 'template'`): quando o `generate_month` passar a criar slots de entrega (Passo 4), as pendentes serão removidas por migration; as concluídas ficam como histórico na linha do tempo.
- **Cadência diária** (ex.: Stories) vira **uma entrega por semana** ("Stories da semana"), não um slot por dia útil. Evita ~22 itens por cliente por mês no quadro.

## 2026-10-27 · Passo 2: design system e shell

- **Tokens em CSS vars** (`src/app/globals.css`) com os valores pedidos e dark mode pronto (`prefers-color-scheme` e `data-theme`). Nomes antigos do Tailwind (`primary`, `danger`, `success`...) foram mapeados para os tokens novos, então telas ainda não refeitas já herdam a paleta. Estados (atraso, aguardando, ok) aparecem como ponto, ícone ou texto pequeno; o `Badge` virou "contorno + ponto".
- **Escala de texto** redefinida no tema: `xs` 12, `sm` 13, `base` 14, `md` 16, `lg` 20, `xl` 28. Texto base 14px. Valores e datas com `tabular-nums` (classe `tabular`, `<time>`, `[data-numeric]`).
- **Hanken Grotesk** via `next/font/google`.
- **Componentes próprios sobre Radix:** Popover, Dialog, Sheet (painel lateral), Tooltip, Select, DropdownMenu; DatePicker e MonthPicker com `react-day-picker` (pt-BR) e atalhos Hoje/Amanhã/Próxima semana; Toast com `sonner`; EmptyState, Skeleton, Kbd, Avatar e etiqueta de cliente. `Field type="date" | "datetime-local" | "month"` agora renderiza os seletores próprios, então não sobrou input nativo de data ou select.
- **Select envia o valor por input oculto próprio**, não pelo do Radix, porque o Radix não aceita valor vazio e enviaria o sentinela interno.
- **Cor do cliente:** `clients.cor` guarda o índice (0 a 9) de uma paleta fixa em `src/config/client-colors.ts`; trigger atribui em rodízio por workspace. A coluna fica anulável (o trigger sempre preenche) para não virar obrigatória nos inserts da API.
- **Shell:** sidebar fixa à esquerda com workspace, busca, Hoje (com contador de tarefas atrasadas e de hoje), Entregas, Calendário, Financeiro, lista de clientes com avatar, Pacotes, Ajustes e conta. Recolhível (estado em cookie, para não piscar no SSR) e drawer no mobile. Entregas e Calendário estão com página provisória até o Passo 5.
- **⌘K com `cmdk`:** ações (nova tarefa, nova entrega, novo cliente), navegação, clientes filtrados no cliente e entregas/tarefas buscadas no servidor (`searchWorkspace`, com escape de `%` e `_`).
- **Atalhos:** C nova tarefa, E nova entrega, G+H Hoje, G+C clientes (também G+E entregas, G+F financeiro), `/` e ⌘K buscar. Ignorados enquanto se digita ou com um diálogo aberto.
- **Criação rápida** (tarefa e entrega) em diálogo do shell, com cliente em popover com busca e data em popover; botões "Nova tarefa" e "Nova entrega" das páginas abrem o mesmo diálogo.
- **Movimento:** animações de 120 a 160 ms só em popover, diálogo e painel; `prefers-reduced-motion` zera todas.
- **Microcopy:** plurais com `plural()` (sem "(s)"), datas relativas (`formatRelativeDay`, `formatRelativeTime`).

## 2026-10-27 · Passo 3: tela Hoje

- **Seções fixas, nesta ordem:** Atrasadas, Para hoje, Esperando o cliente (em aprovação há 2 dias ou mais), Para receber (em aberto vencendo em até 3 dias ou atrasadas), Reuniões de hoje. Seção vazia não aparece; dia todo vazio mostra "Dia limpo" com atalho para as entregas.
- **Atrasadas e Para hoje incluem entregas** em Planejar ou Produzir com publicação até hoje, além das tarefas. Sem isso, a Hoje ficaria cega para o conteúdo quando o `generate_month` passar a criar entregas (Passo 4).
- **Ações reais na linha:** concluir (com Desfazer no toast), adiar para amanhã (tarefa ou data de publicação), abrir; Cobrar no WhatsApp e Marcar como paga nas cobranças; Reenviar link de aprovação, com mensagem que diz quantos conteúdos o cliente tem esperando. A linha some na hora e volta se o servidor recusar.
- **Ações aparecem no hover ou foco no desktop** e ficam sempre visíveis, só com ícone, no celular (onde não existe hover). No celular, cliente e data vão para uma segunda linha.
- **Painel lateral da tarefa** (Sheet): editar título, cliente e data, concluir, excluir com confirmação, sem sair da tela.
- **Criação rápida no topo** com cliente e data em popovers; o atalho C abre o mesmo fluxo em diálogo.
- **`loading.tsx` e `error.tsx`** no workspace: skeleton enquanto carrega e tela de erro com "Tentar de novo".

## 2026-10-27 · Passo 4: tarefa e entrega separadas

- **Entrega é o conteúdo; tarefa é ação operacional.** `generate_month` agora cria **slots de entrega** (`deliverables` com `titulo` nulo, `slot_label` "Post 3 de 10", `competencia` e `slot_key`) em vez de tarefas-checkbox. O retorno passou a ser `(entregas_criadas, cobrancas_criadas)`.
- **Idempotência por `(client_id, competencia, slot_key)`**: dar título, mudar data ou etapa de um slot não faz a próxima geração recriá-lo.
- **Data sugerida:** mensal = N datas espalhadas no mês; semanal = N por semana a partir de cada segunda; diária = 1 entrega por semana ("Stories da semana 2 de 5"). Formato inferido do tipo do item (Reels, Carrossel, Stories, Relatório; o resto vira Post).
- **Título obrigatório só para entrega avulsa** (constraint: título ou rótulo do slot). Na interface o nome exibido é `titulo ?? slot_label`, com rascunho em itálico.
- **`deliverables.responsavel_id`** (membro do workspace, validado por trigger) já criado para o filtro do Passo 5.
- **Tarefas antigas do pacote:** as pendentes foram removidas pela migration; as concluídas ficam como histórico.
- **Seed:** dois meses gerados (atual e seguinte), títulos realistas por cliente, passado publicado, semana atual em produção ou aprovação, futuro como rascunho; tarefas operacionais (cobrar material, enviar relatório, confirmar gravação) e uma reunião hoje.
- **Busca da ⌘K** procura só por título: rascunhos sem título não aparecem.

## 2026-10-27 · Passo 5: entregas e calendário

- **Painel da entrega pela URL** (`?entrega=id`), montado no shell: abre por cima de qualquer tela (Hoje, quadro, semana, calendário, ficha do cliente, ⌘K) sem trocar de página, e o link pode ser compartilhado. Campos salvam sozinhos (selects na hora; título e legenda ao sair do campo).
- **Enviar para aprovação** muda a etapa e oferece, no toast, abrir o WhatsApp com a mensagem e o link do portal. Em aprovação, o botão vira "Lembrar o cliente".
- **Comentários da equipe** (`deliverable_comments`, só o autor apaga) e **histórico** (`deliverable_activity`, escrito por trigger com quem fez: criação, etapa, data, título, responsável). Slots gerados pelo pacote não entram no histórico ao nascer.
- **Quadro de todos os clientes** com filtros na URL (cliente, formato, responsável). Mostra entregas a partir de 35 dias atrás para a coluna Publicado não crescer sem fim; a ficha do cliente mostra todas dele.
- **Cartão:** faixa na cor do cliente, título ou rascunho em itálico, formato, data com popover de calendário (mudar a data sem abrir a entrega; atrasada em vermelho), contagem de arquivos e avatar do responsável.
- **Semana:** sete colunas (segunda a domingo); arrastar muda a data de publicação.
- **Calendário do mês:** entregas por data (publicadas riscadas) e reuniões; no celular, só os dias que têm algo.
- **`cn` agora usa `tailwind-merge`** (com a escala de texto própria), para classes passadas por quem usa o componente vencerem as padrão.
- **dnd-kit recebe `id` estável (`useId`)**, senão o ID de acessibilidade diverge entre servidor e cliente e gera erro de hidratação.

## 2026-10-27 · Passo 6: página do cliente

- **Layout de registro (Attio):** cabeçalho com avatar, status, pacote, valor e próximo vencimento (vermelho se atrasado) e as ações Enviar link do portal, Nova entrega, Nova reunião e Editar.
- **Visão geral em duas colunas:** à esquerda o resumo do mês (entregas publicadas sobre o total, em aprovação, atrasadas, mensalidade, próxima reunião, escopo pendente), as próximas entregas (abrem o painel) e as tarefas abertas do cliente; à direita os atributos (status, segmento, pacote, valor, vencimento, início), contatos com WhatsApp e e-mail, links, briefing e tom de voz. No celular vira uma coluna.
- **Abas:** Visão geral, Entregas (quadro do cliente), Calendário (mês do cliente com reuniões), Reuniões, Financeiro (histórico com recebido e em aberto), Escopo e Linha do tempo (com ícone por tipo de evento).
- **Excluir cliente pede confirmação** em linha (antes era um clique).

## 2026-10-27 · Passo 7: fluxos do MVP completos

- **Portal com a marca do workspace:** cabeçalho com o logo (ou a inicial) e o nome do workspace, saudação ao cliente com quantos conteúdos esperam, cartões no design system e "Suas respostas recentes" (30 dias). O logo fica em `workspaces.logo_path`, dentro de `{workspace_id}/marca/` (constraint garante a pasta do próprio workspace), e é enviado em Ajustes por proprietário ou administrador (PNG, JPG ou WebP até 2 MB; o anterior é apagado do Storage).
- **Notificações in-app:** trigger em `approvals` cria uma notificação para cada membro do workspace quando o cliente aprova ou pede ajuste. Cada um só vê e só marca as suas; a única coluna editável é `lida_em` (grant por coluna). O sino fica no menu lateral com contador; abrir a lista marca tudo como lido e clicar leva ao painel da entrega.
- **Financeiro:** receita do mês numa faixa só (previsto, recebido, em aberto, atrasado e barra do recebido), cobranças do mês, inadimplentes com a idade da dívida mais antiga e situação do mês por cliente. O histórico completo por cliente fica na aba Financeiro da ficha.
- **Reuniões, ata com IA e escopo** seguem o fluxo das Fases 5 e 6, agora com os componentes novos; os próximos passos confirmados viram tarefas operacionais e aparecem na Hoje.
- **Testes de banco filtram pelo próprio workspace**, para passarem também num banco local já usado.

## 2026-11-06 · Pauta, Fase 0: auditoria

- **`docs/spec.md` não existe no repositório.** Contexto: o CLAUDE.md o cita como fonte da verdade, mas ele não veio no commit "docs corrigidos". Escolha: seguir as 12 telas de `docs/design/`, o README de design, o pedido desta rodada e as decisões anteriores; onde nada cobre, a opção mais simples. Alternativa: parar e pedir a spec (descartada, a execução é autônoma).
- **Telas movidas para `docs/design/` e CLAUDE.md para a raiz.** Contexto: o commit "docs corrigidos" deixou tudo solto em `docs/`, mas o CLAUDE.md e o pedido citam `docs/design/`. Escolha: `git mv` sem mudar conteúdo. Alternativa: ajustar os textos que citam o caminho.
- **Nomes de tabela atuais ficam.** `invitations` faz o papel de `invites`, `deliverables` o de posts e `approvals` o de `approval_responses`. Contexto: renomear tabela com dados quebra código e arrisca perda. Escolha: só migrações aditivas. Alternativa: renomear e criar views de compatibilidade.
- **Testes de banco num Postgres 16 local.** Contexto: `supabase start` não baixa imagens neste ambiente. Escolha: `scripts/db-test-local.sh` sobe um Postgres descartável com um esqueleto de `auth`, `storage` e papéis (`scripts/supabase-stub.sql`) e roda os mesmos testes pgTAP. Alternativa: testar no remoto (descartado: risco de sujar dados).

## 2026-11-06 · Pauta, Fase 1: design system e casca

- **Tokens no `@theme` do `globals.css`.** Contexto: o projeto usa Tailwind 4, que não tem `tailwind.config`. Escolha: tokens do README como variáveis CSS e `@theme inline`; os nomes antigos (`accent`, `late`, `ok`, `muted`) apontam para os novos, então telas antigas já herdam o visual. Alternativa: criar `tailwind.config.ts` em modo de compatibilidade.
- **Sem modo escuro.** Contexto: o design só define o tema claro. Escolha: remover o modo escuro em vez de inventar cores. Alternativa: derivar uma paleta escura.
- **Paleta de cliente com 10 cores** (5 do README + Verde, Vermelho, Mostarda, Petróleo, Grafite), cada uma com forte, tonal, texto e miniatura. `clients.cor` continua guardando o índice, então clientes existentes mudam de tom sem migração.
- **Sidebar fixa de 248px, sem recolher.** Contexto: o design não mostra a sidebar recolhida. Escolha: remover o recolhimento (e o cookie); no celular vira gaveta. Alternativa: manter o botão de recolher.
- **Ajustes dentro da casca principal**, com submenu à esquerda (Estúdio, Equipe, Plano, Integrações, IA e ChatGPT, Minha conta). O design de Equipe troca a sidebar inteira por "Voltar para a pauta"; manter a casca evita uma segunda navegação. Alternativa: layout próprio como no design.
- **Rotas do design:** `/producao` (antes `/entregas`) e `/ajustes/*` (antes `/configuracoes`). As rotas antigas redirecionam.
- **Botão Novo abre menu** (Post, Tarefa, Reunião, Cliente). O design mostra só o botão.
- **vitest para testes de TypeScript** (`pnpm test`), com `server-only` substituído por um módulo vazio.

## 2026-11-06 · Pauta, Fase 2: autenticação, equipe e onboarding

- **Membro só vê clientes atribuídos; financeiro só owner/admin.** `client_assignees` + `can_access_client()` em todas as policies de tabelas ligadas a cliente (clientes, posts, tarefas com cliente, reuniões, escopo, aprovações, comentários, histórico). `payments` passou para owner/admin. Backfill: todo membro existente ficou atribuído a todos os clientes, para ninguém perder acesso. Alternativa: começar sem atribuições (descartada, quebraria quem já usa).
- **Membro não cria nem exclui cliente**, só edita os atribuídos. Contexto: o design diz que membro "trabalha nos clientes atribuídos". Alternativa: deixar criar e atribuir automaticamente.
- **`clients.valor_mensal` continua legível para membros no banco** (a coluna está na mesma linha do cliente); a interface esconde valores para quem não é owner/admin. Alternativa: mover preço para outra tabela (fica para quando houver necessidade real).
- **Limite de lugares vale na entrada, não no convite.** Contexto: o design mostra "O convite do Rafa fica esperando um lugar livre". Escolha: convites além do limite são guardados; o aceite só passa se houver lugar. Alternativa (antiga): bloquear o convite.
- **Login por provedor em modo demonstração** abre uma tela de consentimento simulada (`/auth/simulado/[provedor]`) onde a pessoa escolhe o e-mail da conta. Com service role, o usuário é criado confirmado e a sessão abre por link mágico gerado no servidor; sem ela, por senha derivada do e-mail com `MOCK_AUTH_SECRET`. Só funciona com `INTEGRATIONS_MODE=mock`.
- **ChatGPT como fluxo próprio no servidor (PKCE)**, não como provedor OIDC do Supabase: o Supabase não aceita OIDC customizado em todos os planos. O vínculo é pelo e-mail verificado e a sessão abre com o mesmo mecanismo do login simulado.
- **Convite pela página pública usa a service role** (`get_invitation_preview` só para service_role). Sem a chave, a prévia aparece depois do login. Segue a regra do CLAUDE.md de não liberar anon no banco.
- **E-mail atrás de adapter** (`src/lib/email`): mock registra no log; real usa Resend.
- **Onboarding sem upload de logo e sem "Copiar link de convite" genérico.** Convites são por e-mail (o aceite exige o mesmo e-mail); o logo fica em Ajustes > Estúdio. O passo 3 deixa as contas Meta para a página do cliente (Fase 8).
- **Pacote padrão "Essencial"** criado no passo 3 quando o espaço não tem pacote: 3 posts por semana, 1 reunião e 1 relatório por mês.
- **`profiles.email`** sincronizado de `auth.users` por trigger, para a tela de Equipe.

## 2026-11-06 · Pauta, Fase 3: Em pauta hoje

- **"Minha pauta"**: o que tem a pessoa como responsável, mais o que não tem responsável e é de um cliente atribuído a ela. "Pauta do time": tudo. Contexto: tarefas não tinham responsável; ganharam `tasks.responsavel_id`. Alternativa: só itens com responsável (deixaria muito item órfão fora).
- **Blocos e regras**: Com quem falar = reuniões do dia (a próxima em destaque) + ajustes pedidos nas últimas 48 h (um por cliente) + próximos passos de ata que vencem hoje. O que fazer = tarefas até hoje + posts em planejamento/produção com data até hoje. Com o cliente = posts em aprovação agrupados por cliente. Publicações e dinheiro = posts aprovados/publicados de hoje + cobranças vencidas ou de hoje (só owner/admin). Propostas e contratos entram quando o comercial existir (Fase 10).
- **Saudação** escolhida no servidor entre opções por período, dia da semana e fatos reais (aprovações de ontem); a última vai num cookie para não repetir.
- **`getDailyAgenda` = leitura + `buildDailyAgenda` puro**, testado com vitest. A leitura não inventa nada: bloco sem dado mostra estado vazio.
- **`deliverables.hora_publicacao`** para ordenar as publicações do dia.

## 2026-11-06 · Pauta, Fase 4: clientes

- **Abas por `?aba=`** com os nomes do design (Visão geral, Estratégia, Calendário, Produção, Reuniões, Arquivos, Financeiro, Escopo, Relatórios, Linha do tempo). Financeiro só aparece para owner/admin. `?aba=entregas` antigo vira Produção.
- **Kit da marca e briefing ficam na aba Arquivos**, junto dos arquivos do cliente. O design não mostra a aba; juntar tudo que é "material do cliente" num lugar foi o mais simples.
- **Checklist de onboarding com itens automáticos** (pacote, briefing, kit, Instagram, pasta no Drive, kickoff) marcados quando o dado existe; os manuais (contrato) ficam em `clients.onboarding_checklist`. O card some da Visão geral quando tudo está feito.
- **Briefing público em `/b/[token]`** e **kit só leitura em `/k/[token]`**, ambos pelo servidor com service role e funções só para `service_role`. O kit só abre com `share_ativo` ligado ("Compartilhar com designer"). Gerar outro link de briefing invalida o anterior.
- **`timeline_events`** guarda eventos manuais (notas) e de sistema (briefing respondido) e entra na view `client_timeline`, que segue sendo a leitura única.
- **Storage**: arquivos de cliente em `{workspace}/clientes/{cliente}/{categoria}/...`; `can_access_media` passou a exigir acesso ao cliente nessa pasta.
- **Instagram e pasta do Drive como campos simples** (`instagram_handle`, `drive_folder_url`) até as integrações reais (Fases 8 e 9).
- **Rodadas de ajuste** na Visão geral = pedidos de ajuste do cliente no mês (tabela `approvals`).

## 2026-11-06 · Pauta, Fase 5: pacotes e planejamento

- **Capacidade do pacote = vagas que o `generate_month` criaria no mês** (mesma regra de datas, diário vira 1 por semana). Usados = posts do cliente na competência (ou com data no mês). Criar post com o mês cheio pergunta: "Sim, registrar como extra" cria o post e um `scope_requests` com `origem = limite_pacote`; "Não" cria só o post.
- **Planejar o mês** no calendário chama `generate_month` (idempotente) para o mês seguinte. Agendamento automático com `pg_cron` no dia 20 às 06:00 UTC (`generate_month_all`), só se a extensão existir; senão a migração só avisa.
- **Calendário começa no domingo**, como o design. O resto do app (semana da Produção) segue segunda a domingo.
- **Arrastar para mudar a data** usa arrastar e soltar nativo do navegador; quem usa teclado muda a data no painel do post.
- **Filtro de clientes do calendário** fica no próprio calendário (lado esquerdo), não na sidebar, porque a sidebar é compartilhada por todas as telas.
- **Pacote ganhou `preco` e `limite_rodadas`** (padrão 2). O valor que vale para a cobrança continua sendo `clients.valor_mensal`.

## 2026-11-06 · Pauta, Fase 6: posts e IA

- **Etapas do post**: Planejado (`planejar`), Em produção (`produzir`), Em aprovação, Ajuste pedido (`ajuste`, novo), Agendado (`agendado`, novo), Publicado. `aprovado` continua existindo (o cliente aprovou e falta agendar) e aparece na coluna Agendado com o aviso "aprovado, falta agendar". Alternativa: migrar `aprovado` para `agendado` (descartada: perde a diferença entre aprovado e agendado na Meta).
- **Editor no painel lateral (560px)** em `post-editor.tsx`, com etapas em bolinhas, arte (Canva, Drive, upload), legenda com contador de 2.200, ações de IA, detalhes (pilar da estratégia, responsável, prazo interno, data e hora, formato, onde publica), rodadas x limite do pacote, checklist, respostas do cliente, comentários internos, versões, histórico e pré-visualização de feed e reels. "Enviar para aprovação" salva uma versão antes.
- **IA com interface única** (`src/lib/ai`): `runAi(workspace, prompt, vars)` decide entre o plano do ChatGPT da pessoa e os créditos do espaço (`planAiRoute`, testado), cai para os créditos com aviso quando o ChatGPT devolve limite ou conta não elegível, e grava `ai_usage` (com a versão do prompt). Créditos por plano: 100 (grátis), 1.000 (Pro), 3.000 (Estúdio). Custo: legenda 3, encurtar/tom/chamada 1, estratégia 5.
- **Sem `ANTHROPIC_API_KEY` a IA responde em demonstração** (`providers/mock.ts`), inclusive a ata de reunião, que passa a organizar as próprias anotações em vez de dar erro.
- **Prompts versionados em arquivos** (`src/lib/ai/prompts`): mudar o texto exige subir a versão (`legenda@1` etc.).
- **Conexão do ChatGPT é por pessoa** (`ai_connections`), não por espaço. Tokens cifrados com AES-256-GCM (`src/lib/crypto.ts`, `ENCRYPTION_KEY`); as colunas de token não têm grant de leitura e só saem por `get_ai_connection_secret`, que devolve apenas a linha do próprio usuário. Em demonstração a conexão é simulada e há um botão para simular o fim do limite semanal.
- **IA nunca salva sozinha**: a sugestão entra no campo e a pessoa revisa.

## 2026-11-07 · Pauta, Fase 7: portal do cliente

- **Portal mobile um post por vez** ("1 de 3"), com Aprovar, Pedir ajuste (comentário obrigatório e ponto opcional tocando na imagem) e "Aprovar os N de uma vez". O nome fica guardado no aparelho (`localStorage`) e é pedido só na primeira resposta.
- **Cada resposta guarda nome, data, IP, navegador, versão do post e o ponto** (`approvals.ip`, `user_agent`, `versao`, `ponto`). IP vem de `x-forwarded-for` no servidor.
- **Ajuste pedido move o post para "Ajuste pedido"** (não mais para produção) e soma uma rodada. Passou do limite do pacote: o banco cria uma sugestão em `scope_requests` (`origem = rodadas`, uma por post) e avisa owner/admin.
- **Planejamento do mês aprovável** (`month_plans`): a equipe envia pela aba Calendário do cliente; o cliente aprova ou pede ajuste no portal; vira evento na linha do tempo e notificação.
- **Lembrete de 48 h é para a equipe** (notificação in-app com sugestão de reenviar no WhatsApp), porque wa.me exige uma pessoa clicando. No máximo um lembrete a cada 48 h por post.
- **Aprovação tácita é opcional por cliente** (48 h, 72 h ou 5 dias), desligada por padrão; registra "Aprovação tácita (sem resposta no prazo)" como autor.
- **Jobs**: `run_approval_reminders()` agendado de hora em hora no pg_cron, e também exposto em `POST /api/jobs/lembretes` protegido por `CRON_SECRET`.
- **Migrações no remoto pelo MCP** ficam com número de versão diferente do arquivo (ex.: `deliverables` virou `20261107033129`). Antes de usar `supabase db push`, alinhar com `supabase migration repair` (passo a passo em `docs/beta-checklist.md`).

## 2026-11-07 · Pauta, Fase 8: publicação Meta

- **Conexão por espaço, feita por owner/admin** (`social_connections`), com token de longa duração cifrado e sem grant de leitura da coluna. O token da página do Facebook é pedido na hora de publicar, não guardado.
- **Contas descobertas ficam em `social_accounts`** e são ligadas a um cliente na aba Arquivos do cliente. Só contas do próprio cliente aparecem para agendar (o banco confere).
- **Fila no banco** (`publish_jobs`) com `claim ... for update skip locked`, backoff de 1, 5, 15 e 60 minutos até 5 tentativas; erro definitivo (token expirado, permissão, mídia recusada) para na hora e avisa a equipe. Processamento em `POST /api/jobs/publicar` (a cada minuto, `CRON_SECRET`), porque a chamada à Meta acontece no servidor do app, não no banco.
- **Adapter da Meta** (`src/lib/integrations/meta`): imagem, carrossel (itens + container CAROUSEL), reels e vídeo (espera o processamento), stories e página do Facebook (photos, videos ou feed). Erros da Graph API traduzidos para frases legíveis. Testado com uma Graph API falsa.
- **Instagram sem página** usa o Business Login for Instagram e o host `graph.instagram.com`.
- **Renovação de tokens** em `POST /api/jobs/renovar-tokens` (diária): renova o que vence em 7 dias; se falhar, marca a conexão como expirada e o erro aparece como "Reconectar".
- **Tabela genérica `integration_connections`** criada já aqui para Google, Canva, Granola, Asaas e assinatura (pessoais ou do espaço).

## 2026-11-07 · Pauta, Fase 9: Google, Granola e Canva

- **Conexões pessoais** (Google, Canva, Granola) em `integration_connections`, uma por pessoa e espaço; OAuth real genérico com PKCE em `/api/integrations/[id]/start` e `/callback`.
- **Google Agenda**: "Trazer do Google Agenda" importa os próximos 7 dias e liga cada evento ao cliente pelo e-mail dos convidados (contatos do cliente); eventos sem e-mail de cliente ficam de fora. Reunião criada no Pauta pode virar evento com Meet. **Drive**: escopo `drive.file`; "Criar pasta no Drive" grava o link no cliente. O seletor do Drive real (Google Picker) fica como TODO; em demonstração, uma tela simulada gera a arte.
- **Granola como cliente MCP** (JSON-RPC via HTTP, chamadas `search_meetings` e `get_meetings`), sem dependência nova. As notas entram nas anotações da reunião e passam pelo fluxo de ata que já existia (sugestões que a pessoa confirma antes de virar tarefa). Colar as notas continua funcionando.
- **Brief da reunião** montado com dados reais (posts esperando, última decisão, tarefas em aberto, pagamento do mês para owner/admin, publicados no mês passado) e aviso 15 minutos antes (`run_meeting_briefs`, pg_cron a cada 5 minutos e `/api/jobs/briefs`).
- **Canva nos dois sentidos**: "Criar no Canva" cria o design pela Connect API e abre o editor com `correlation_state`; o retorno (`/api/integrations/canva/return`) exporta PNG e salva como nova versão. App em `apps/canva-app` (Apps SDK) com "Enviar para o Pauta", identificado por um código gerado em Ajustes e o código do post. Em demonstração, uma tela simulada desenha a arte com as cores do kit da marca.

## 2026-11-07 · Pauta, Fase 10: comercial

- **Comercial só para owner/admin** (RLS em `leads`, `proposals`, `proposal_views`, `contracts`; menu e página escondidos para membros).
- **Funil em 6 etapas** (Novos, Em conversa, Proposta enviada, Negociação, Ganhos, Perdidos), arrastar para mudar. Montar proposta move o lead para "Proposta enviada"; aceitar move para "Negociação"; assinar move para "Ganhos".
- **Proposta nasce do primeiro pacote** (itens e preço) e pode trocar de pacote; diagnóstico escrito com IA (`diagnostico@1`). Página pública `/pr/[token]` registra cada abertura (`proposal_views`) e avisa a equipe só na primeira do dia.
- **PDF pela impressão do navegador** (`?imprimir=1` abre a caixa de impressão com CSS próprio). Alternativa: gerar PDF no servidor com uma biblioteca (descartada nesta rodada para não adicionar dependência pesada).
- **Contrato com variáveis** a partir de um modelo editável por espaço (`workspaces.contrato_modelo`, com padrão no código). Assinatura simples em `/ct/[token]` (nome, data, IP e "li e concordo") ou pelo adapter de Clicksign/ZapSign, com webhook `/api/webhooks/assinatura` protegido por `SIGNATURE_WEBHOOK_TOKEN`. Em demonstração sempre usa a assinatura simples.
- **Contrato assinado vira cliente no banco** (`sign_contract`): cria o cliente com pacote, valor, vencimento e contato do lead, atribui ao owner, marca "Contrato assinado" no checklist, registra na linha do tempo e roda `generate_month` (cobrança e posts do primeiro mês).
- **Renovação**: aviso 30 dias antes do fim (`run_contract_renewals`, pg_cron diário) e lista "Renovações chegando" no Comercial.
- **Na Em pauta hoje**: "abriu a proposta N vezes desde ontem" em Com quem falar e "Contrato para assinar" em Com o cliente (só owner/admin).
