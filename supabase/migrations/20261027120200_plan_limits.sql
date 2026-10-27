-- Limites por plano validados no banco.
-- Membros: conta membros atuais + convites pendentes (não expirados).
-- O limite de clientes é aplicado na migration de clientes (Fase 2).

create or replace function public.workspace_seat_usage(p_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.workspace_members m where m.workspace_id = p_workspace_id)::integer
    + (select count(*) from public.invitations i
       where i.workspace_id = p_workspace_id
         and i.accepted_at is null
         and i.expires_at > now())::integer;
$$;

create or replace function public.enforce_member_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  limite integer;
begin
  -- Convites: autoriza antes de revelar qualquer informação sobre o limite.
  -- (workspace_members não tem grant de insert; entra só pelas RPCs.)
  if tg_table_name = 'invitations'
     and coalesce(auth.role(), '') in ('authenticated', 'anon')
     and not public.has_workspace_role(new.workspace_id, array['owner', 'admin']::public.workspace_role[]) then
    raise exception 'Sem permissão neste workspace' using errcode = '42501';
  end if;

  -- Trava o workspace para serializar inserções concorrentes.
  select l.max_members into limite
  from public.workspaces w
  join public.plan_limits l on l.plano = w.plano
  where w.id = new.workspace_id
  for update of w;

  if public.workspace_seat_usage(new.workspace_id) >= limite then
    raise exception 'Limite de % usuário(s) do plano atingido', limite
      using errcode = 'P0001', hint = 'PLAN_LIMIT_MEMBERS';
  end if;
  return new;
end;
$$;

create trigger workspace_members_enforce_limit before insert on public.workspace_members
  for each row execute function public.enforce_member_limit();

create trigger invitations_enforce_limit before insert on public.invitations
  for each row execute function public.enforce_member_limit();

-- Uso e limites do workspace, para a UI.
create or replace function public.workspace_usage(p_workspace_id uuid)
returns table (
  plano public.plan_tier,
  max_members integer,
  max_clients integer,
  members integer,
  pending_invitations integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    w.plano,
    l.max_members,
    l.max_clients,
    (select count(*) from public.workspace_members m where m.workspace_id = w.id)::integer,
    (select count(*) from public.invitations i
     where i.workspace_id = w.id and i.accepted_at is null and i.expires_at > now())::integer
  from public.workspaces w
  join public.plan_limits l on l.plano = w.plano
  where w.id = p_workspace_id
    and public.is_workspace_member(w.id);
$$;

grant execute on function public.workspace_usage(uuid) to authenticated;
