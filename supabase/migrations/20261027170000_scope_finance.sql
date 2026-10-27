-- Pedidos de escopo extra e ajustes do financeiro.

create type public.scope_status as enum ('pendente', 'cobrado', 'absorvido');

create table public.scope_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  descricao text not null check (char_length(trim(descricao)) between 1 and 2000),
  valor_sugerido numeric(12, 2) check (valor_sugerido is null or valor_sugerido >= 0),
  status public.scope_status not null default 'pendente',
  resolvido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, workspace_id)
    references public.clients (id, workspace_id) on delete cascade
);

create index scope_requests_workspace_id_idx on public.scope_requests (workspace_id);
create index scope_requests_client_id_idx on public.scope_requests (client_id);

create trigger scope_requests_updated_at before update on public.scope_requests
  for each row execute function public.set_updated_at();

-- resolvido_em acompanha a saída de "pendente".
create or replace function public.set_scope_resolved_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'pendente' then
    new.resolvido_em := null;
  elsif tg_op = 'INSERT' or old.status is distinct from new.status then
    new.resolvido_em := now();
  end if;
  return new;
end;
$$;

create trigger scope_requests_resolved_at before insert or update of status on public.scope_requests
  for each row execute function public.set_scope_resolved_at();

alter table public.scope_requests enable row level security;

create policy "scope_requests: membros" on public.scope_requests
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)))
  with check ((select public.is_workspace_member(workspace_id)));

revoke all on public.scope_requests from anon, authenticated;
grant select, insert, update, delete on public.scope_requests to authenticated;

-- ============================================================
-- Financeiro
-- ============================================================

-- pago_em e status andam juntos.
alter table public.payments
  add constraint payments_pago_consistente
  check ((status = 'pago') = (pago_em is not null));

-- Marca como atrasadas as cobranças vencidas de todos os workspaces.
-- Para rodar diariamente via pg_cron (não exposto à API):
-- select cron.schedule('payments-overdue', '0 9 * * *', $$ select public.mark_overdue_payments() $$);
create or replace function public.mark_overdue_payments()
returns integer
language sql
security definer
set search_path = ''
as $$
  with atualizadas as (
    update public.payments
    set status = 'atrasado'
    where status = 'pendente'
      and vencimento < (now() at time zone 'America/Sao_Paulo')::date
    returning 1
  )
  select count(*)::integer from atualizadas;
$$;

revoke execute on function public.mark_overdue_payments() from public, anon, authenticated;

-- ============================================================
-- Linha do tempo: escopo
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
from public.meetings m

union all
select s.workspace_id, s.client_id, s.created_at,
       'escopo_pedido', 'Pedido extra: ' || s.descricao, s.id
from public.scope_requests s

union all
select s.workspace_id, s.client_id, s.resolvido_em,
       'escopo_' || s.status::text,
       case s.status when 'cobrado' then 'Extra cobrado: ' else 'Extra absorvido: ' end || s.descricao,
       s.id
from public.scope_requests s
where s.resolvido_em is not null;
