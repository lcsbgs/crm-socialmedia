-- Reuniões com ata gerada por IA. Próximos passos confirmados viram tarefas (origem "ata").

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  titulo text not null default 'Reunião' check (char_length(trim(titulo)) between 1 and 200),
  data timestamptz not null default now(),
  notas_brutas text not null default '' check (char_length(notas_brutas) <= 50000),
  -- Ata como a IA devolveu (e o usuário revisou): { resumo, decisoes[], proximos_passos[] }
  ata_ia jsonb,
  -- Decisões confirmadas (lista de textos).
  decisoes jsonb not null default '[]'::jsonb check (jsonb_typeof(decisoes) = 'array'),
  ata_confirmada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (client_id, workspace_id)
    references public.clients (id, workspace_id) on delete cascade
);

create index meetings_workspace_id_idx on public.meetings (workspace_id);
create index meetings_client_id_idx on public.meetings (client_id);
create index meetings_workspace_data_idx on public.meetings (workspace_id, data);

create trigger meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

-- tasks.meeting_id passa a ter FK (mesmo workspace).
create index tasks_meeting_id_idx on public.tasks (meeting_id);
alter table public.tasks
  add constraint tasks_meeting_fk foreign key (meeting_id, workspace_id)
  references public.meetings (id, workspace_id) on delete set null (meeting_id);

alter table public.meetings enable row level security;

create policy "meetings: membros" on public.meetings
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)))
  with check ((select public.is_workspace_member(workspace_id)));

revoke all on public.meetings from anon, authenticated;
grant select, insert, update, delete on public.meetings to authenticated;

-- ============================================================
-- Linha do tempo: reuniões
-- ============================================================

create or replace view public.client_timeline
with (security_invoker = true)
as
select c.workspace_id, c.id as client_id, c.created_at as ocorreu_em,
       'cliente_criado'::text as tipo, 'Cliente cadastrado'::text as titulo, c.id as ref_id
from public.clients c

union all
select c.workspace_id, c.id, c.inicio_contrato::timestamp at time zone 'America/Sao_Paulo',
       'contrato_inicio', 'Início do contrato', c.id
from public.clients c
where c.inicio_contrato is not null

union all
select t.workspace_id, t.client_id, t.done_at,
       'tarefa_feita', 'Tarefa concluída: ' || t.titulo, t.id
from public.tasks t
where t.client_id is not null and t.done_at is not null

union all
select p.workspace_id, p.client_id, p.created_at,
       'cobranca_gerada', 'Cobrança gerada: ' || to_char(p.competencia, 'MM/YYYY'), p.id
from public.payments p

union all
select p.workspace_id, p.client_id, p.pago_em::timestamp at time zone 'America/Sao_Paulo',
       'pagamento_recebido', 'Pagamento recebido: ' || to_char(p.competencia, 'MM/YYYY'), p.id
from public.payments p
where p.pago_em is not null

union all
select d.workspace_id, d.client_id, d.created_at,
       'entrega_criada', 'Entrega criada: ' || d.titulo, d.id
from public.deliverables d

union all
select d.workspace_id, d.client_id, d.status_changed_at,
       'entrega_' || d.status::text,
       case d.status
         when 'em_aprovacao' then 'Enviada para aprovação: '
         when 'aprovado' then 'Entrega aprovada: '
         else 'Entrega publicada: '
       end || d.titulo,
       d.id
from public.deliverables d
where d.status in ('em_aprovacao', 'aprovado', 'publicado')

union all
select a.workspace_id, d.client_id, a.created_at,
       'aprovacao_' || a.decisao::text,
       case a.decisao when 'aprovado' then 'Cliente aprovou: ' else 'Cliente pediu ajuste: ' end
         || d.titulo || ' (' || a.autor_nome || ')'
         || coalesce(': "' || a.comentario || '"', ''),
       a.id
from public.approvals a
join public.deliverables d on d.id = a.deliverable_id

union all
select m.workspace_id, m.client_id, m.data,
       'reuniao', 'Reunião: ' || m.titulo, m.id
from public.meetings m;
