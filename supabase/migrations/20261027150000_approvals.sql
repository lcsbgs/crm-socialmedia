-- Aprovações do portal do cliente.
-- O portal é público (sem login) mas NÃO abre RLS para anon: o servidor do Next
-- valida o portal_token e usa o service role, chamando portal_respond().

create type public.approval_decision as enum ('aprovado', 'ajuste');

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  deliverable_id uuid not null,
  decisao public.approval_decision not null,
  comentario text check (comentario is null or char_length(comentario) <= 2000),
  autor_nome text not null check (char_length(trim(autor_nome)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (deliverable_id, workspace_id)
    references public.deliverables (id, workspace_id) on delete cascade
);

create index approvals_workspace_id_idx on public.approvals (workspace_id);
create index approvals_deliverable_id_idx on public.approvals (deliverable_id);

create trigger approvals_updated_at before update on public.approvals
  for each row execute function public.set_updated_at();

alter table public.approvals enable row level security;

-- Membros leem o histórico. Escrita só pelo portal (service role).
create policy "approvals: membros leem" on public.approvals
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

revoke all on public.approvals from anon, authenticated;
grant select on public.approvals to authenticated;

-- Registra a resposta do cliente: valida token, cliente e etapa, grava a
-- aprovação e move a entrega (aprovado -> aprovado, ajuste -> produzir).
create or replace function public.portal_respond(
  p_token uuid,
  p_deliverable_id uuid,
  p_decisao public.approval_decision,
  p_comentario text,
  p_autor_nome text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entrega public.deliverables;
begin
  select d.* into entrega
  from public.deliverables d
  join public.clients c on c.id = d.client_id and c.workspace_id = d.workspace_id
  where c.portal_token = p_token
    and c.status <> 'encerrado'
    and d.id = p_deliverable_id
  for update of d;

  if entrega.id is null then
    raise exception 'Entrega não encontrada' using errcode = 'P0002';
  end if;
  if entrega.status <> 'em_aprovacao' then
    raise exception 'Esta entrega não está mais aguardando aprovação' using errcode = '22023';
  end if;
  if p_decisao = 'ajuste' and char_length(trim(coalesce(p_comentario, ''))) = 0 then
    raise exception 'Descreva o ajuste que você precisa' using errcode = '22023';
  end if;

  insert into public.approvals (workspace_id, deliverable_id, decisao, comentario, autor_nome)
  values (entrega.workspace_id, entrega.id, p_decisao, nullif(trim(p_comentario), ''), trim(p_autor_nome));

  update public.deliverables
  set status = case when p_decisao = 'aprovado' then 'aprovado' else 'produzir' end::public.deliverable_status
  where id = entrega.id;
end;
$$;

revoke execute on function public.portal_respond(uuid, uuid, public.approval_decision, text, text)
  from public, anon, authenticated;
grant execute on function public.portal_respond(uuid, uuid, public.approval_decision, text, text)
  to service_role;

-- Gera um novo link de portal (invalida o anterior). Membros do workspace.
create or replace function public.regenerate_portal_token(p_client_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  novo uuid := gen_random_uuid();
begin
  update public.clients set portal_token = novo where id = p_client_id;
  if not found then
    raise exception 'Cliente não encontrado' using errcode = 'P0002';
  end if;
  return novo;
end;
$$;

grant execute on function public.regenerate_portal_token(uuid) to authenticated;

-- ============================================================
-- Linha do tempo: respostas do cliente
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
join public.deliverables d on d.id = a.deliverable_id;
