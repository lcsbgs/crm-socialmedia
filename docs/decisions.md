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
