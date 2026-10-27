-- Notificações in-app (cliente respondeu no portal) e marca do workspace no portal.

-- Logo do workspace: caminho no bucket "midia" ({workspace_id}/marca/arquivo).
-- O caminho precisa estar na pasta do próprio workspace.
alter table public.workspaces
  add column logo_path text check (logo_path is null or logo_path like id::text || '/marca/%');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null check (tipo in ('aprovacao', 'ajuste')),
  titulo text not null,
  corpo text,
  deliverable_id uuid references public.deliverables (id) on delete cascade,
  lida_em timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, workspace_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id, workspace_id) where lida_em is null;

alter table public.notifications enable row level security;

create policy "notifications: só as minhas" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_workspace_member(workspace_id)));

create policy "notifications: marcar as minhas como lidas" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications: apagar as minhas" on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
-- Só a coluna lida_em pode ser alterada pelo usuário.
grant update (lida_em) on public.notifications to authenticated;

-- Quando o cliente responde no portal, avisa todos os membros do workspace.
create or replace function public.notify_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nome_entrega text;
  nome_cliente text;
begin
  select coalesce(d.titulo, d.slot_label), c.nome into nome_entrega, nome_cliente
  from public.deliverables d
  join public.clients c on c.id = d.client_id
  where d.id = new.deliverable_id;

  insert into public.notifications (workspace_id, user_id, tipo, titulo, corpo, deliverable_id)
  select
    new.workspace_id,
    m.user_id,
    case when new.decisao = 'aprovado' then 'aprovacao' else 'ajuste' end,
    case when new.decisao = 'aprovado'
      then format('%s aprovou "%s"', new.autor_nome, nome_entrega)
      else format('%s pediu ajuste em "%s"', new.autor_nome, nome_entrega)
    end,
    coalesce(nullif(new.comentario, ''), nome_cliente),
    new.deliverable_id
  from public.workspace_members m
  where m.workspace_id = new.workspace_id;

  return new;
end;
$$;

revoke execute on function public.notify_approval() from public, anon, authenticated;

create trigger approvals_notify after insert on public.approvals
  for each row execute function public.notify_approval();
