-- Pauta, Fase 2: equipe, atribuição de clientes e acesso por papel.
-- Só aditiva: nenhuma tabela com dados é apagada ou renomeada.
--
-- Regras:
--   * owner e admin veem todos os clientes; member só os clientes atribuídos (client_assignees).
--   * financeiro (payments) só owner e admin.
--   * convites guardam os clientes da pessoa; o limite de lugares é aplicado na entrada do membro,
--     então convites além do limite ficam "esperando lugar" em vez de serem bloqueados.

-- ============================================================
-- Espaço: modo de trabalho e escolha de IA (onboarding)
-- ============================================================
alter table public.workspaces
  add column if not exists modo_trabalho text not null default 'solo'
    check (modo_trabalho in ('solo', 'equipe', 'agencia')),
  add column if not exists ai_mode text not null default 'creditos'
    check (ai_mode in ('creditos', 'chatgpt'));

alter table public.profiles
  add column if not exists auth_provider text;

-- ============================================================
-- client_assignees
-- ============================================================
create table public.client_assignees (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade,
  foreign key (workspace_id, user_id) references public.workspace_members (workspace_id, user_id) on delete cascade
);
create index client_assignees_user_idx on public.client_assignees (workspace_id, user_id);

-- Backfill: ninguém perde acesso. Todo membro atual fica atribuído a todos os clientes do espaço.
insert into public.client_assignees (workspace_id, client_id, user_id)
select c.workspace_id, c.id, m.user_id
from public.clients c
join public.workspace_members m on m.workspace_id = c.workspace_id
on conflict do nothing;

-- ============================================================
-- Funções de acesso
-- ============================================================
create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_workspace_role(p_workspace_id, array['owner', 'admin']::public.workspace_role[]);
$$;

create or replace function public.can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clients c
    join public.workspace_members m
      on m.workspace_id = c.workspace_id and m.user_id = (select auth.uid())
    where c.id = p_client_id
      and (
        m.role in ('owner', 'admin')
        or exists (
          select 1 from public.client_assignees a
          where a.client_id = c.id and a.user_id = m.user_id
        )
      )
  );
$$;

create or replace function public.can_access_deliverable(p_deliverable_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.deliverables d
    where d.id = p_deliverable_id and public.can_access_client(d.client_id)
  );
$$;

revoke execute on function public.is_workspace_admin(uuid) from public, anon;
revoke execute on function public.can_access_client(uuid) from public, anon;
revoke execute on function public.can_access_deliverable(uuid) from public, anon;
grant execute on function public.is_workspace_admin(uuid) to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;
grant execute on function public.can_access_deliverable(uuid) to authenticated;

-- ============================================================
-- Policies: clientes e tudo que pertence a um cliente
-- ============================================================
alter table public.client_assignees enable row level security;

create policy "client_assignees: membros leem" on public.client_assignees
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));
create policy "client_assignees: admin gerencia" on public.client_assignees
  for insert to authenticated
  with check ((select public.is_workspace_admin(workspace_id)));
create policy "client_assignees: admin remove" on public.client_assignees
  for delete to authenticated
  using ((select public.is_workspace_admin(workspace_id)));

revoke all on public.client_assignees from anon, authenticated;
grant select, insert, delete on public.client_assignees to authenticated;

-- Clientes: leitura e edição por quem tem acesso ao cliente; criar e excluir só owner/admin.
drop policy "clients: membros" on public.clients;
create policy "clients: ler atribuídos" on public.clients
  for select to authenticated
  using ((select public.is_workspace_admin(workspace_id)) or public.can_access_client(id));
create policy "clients: editar atribuídos" on public.clients
  for update to authenticated
  using ((select public.is_workspace_admin(workspace_id)) or public.can_access_client(id))
  with check ((select public.is_workspace_member(workspace_id)));
create policy "clients: admin cria" on public.clients
  for insert to authenticated
  with check ((select public.is_workspace_admin(workspace_id)));
create policy "clients: admin exclui" on public.clients
  for delete to authenticated
  using ((select public.is_workspace_admin(workspace_id)));

-- Tarefas: sem cliente, qualquer membro; com cliente, quem tem acesso a ele.
drop policy "tasks: membros" on public.tasks;
create policy "tasks: membros com acesso" on public.tasks
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)) and (client_id is null or public.can_access_client(client_id)))
  with check ((select public.is_workspace_member(workspace_id)) and (client_id is null or public.can_access_client(client_id)));

drop policy "deliverables: membros" on public.deliverables;
create policy "deliverables: membros com acesso" on public.deliverables
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id))
  with check ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id));

drop policy "meetings: membros" on public.meetings;
create policy "meetings: membros com acesso" on public.meetings
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id))
  with check ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id));

drop policy "scope_requests: membros" on public.scope_requests;
create policy "scope_requests: membros com acesso" on public.scope_requests
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id))
  with check ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id));

drop policy "approvals: membros leem" on public.approvals;
create policy "approvals: membros com acesso leem" on public.approvals
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_deliverable(deliverable_id));

drop policy "deliverable_comments: membros leem" on public.deliverable_comments;
create policy "deliverable_comments: membros com acesso leem" on public.deliverable_comments
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_deliverable(deliverable_id));

drop policy "deliverable_comments: membros comentam como si" on public.deliverable_comments;
create policy "deliverable_comments: membros com acesso comentam" on public.deliverable_comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select public.is_workspace_member(workspace_id))
    and public.can_access_deliverable(deliverable_id)
  );

drop policy "deliverable_activity: membros leem" on public.deliverable_activity;
create policy "deliverable_activity: membros com acesso leem" on public.deliverable_activity
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_deliverable(deliverable_id));

-- Financeiro: só owner e admin.
drop policy "payments: membros" on public.payments;
create policy "payments: owner e admin" on public.payments
  for all to authenticated
  using ((select public.is_workspace_admin(workspace_id)))
  with check ((select public.is_workspace_admin(workspace_id)));

-- Quem cria um cliente fica atribuído a ele (útil quando um admin cria e quer aparecer como responsável).
create or replace function public.assign_client_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and public.is_workspace_member(new.workspace_id) then
    insert into public.client_assignees (workspace_id, client_id, user_id)
    values (new.workspace_id, new.id, auth.uid())
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.assign_client_creator() from public, anon, authenticated;

create trigger clients_assign_creator after insert on public.clients
  for each row execute function public.assign_client_creator();

-- ============================================================
-- Convites: clientes da pessoa e lugares em espera
-- ============================================================
alter table public.invitations
  add column if not exists client_ids uuid[] not null default '{}';

-- O limite passa a valer para membros, não para convites.
create or replace function public.enforce_member_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  limite integer;
  usados integer;
begin
  if tg_table_name = 'invitations' then
    if coalesce(auth.role(), '') in ('authenticated', 'anon')
       and not public.has_workspace_role(new.workspace_id, array['owner', 'admin']::public.workspace_role[]) then
      raise exception 'Sem permissão neste workspace' using errcode = '42501';
    end if;
    -- Convites além do limite são aceitos e ficam esperando lugar.
    return new;
  end if;

  select l.max_members into limite
  from public.workspaces w
  join public.plan_limits l on l.plano = w.plano
  where w.id = new.workspace_id
  for update of w;

  select count(*) into usados from public.workspace_members m where m.workspace_id = new.workspace_id;

  if usados >= limite then
    raise exception 'Limite de % lugares do plano atingido', limite
      using errcode = 'P0001', hint = 'PLAN_LIMIT_MEMBERS';
  end if;
  return new;
end;
$$;

-- Aceite: entra no espaço, recebe os clientes do convite.
create or replace function public.accept_invitation(p_token uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invitations;
  user_email text;
  ws_slug text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;

  select * into inv from public.invitations where token = p_token for update;

  if inv.id is null then
    raise exception 'Convite não encontrado' using errcode = 'P0002';
  end if;
  if inv.accepted_at is not null then
    raise exception 'Este convite já foi usado' using errcode = '22023';
  end if;
  if inv.expires_at < now() then
    raise exception 'Este convite expirou' using errcode = '22023';
  end if;

  select lower(u.email) into user_email from auth.users u where u.id = auth.uid();
  if user_email is distinct from lower(inv.email) then
    raise exception 'Este convite foi enviado para outro e-mail' using errcode = '42501';
  end if;

  -- O trigger de limite barra a entrada se não houver lugar livre.
  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, auth.uid(), inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.invitations set accepted_at = now() where id = inv.id;

  insert into public.client_assignees (workspace_id, client_id, user_id)
  select inv.workspace_id, c.id, auth.uid()
  from public.clients c
  where c.workspace_id = inv.workspace_id and c.id = any (inv.client_ids)
  on conflict do nothing;

  update public.profiles set last_workspace_id = inv.workspace_id where id = auth.uid();

  select slug into ws_slug from public.workspaces where id = inv.workspace_id;
  return ws_slug;
end;
$$;

-- Prévia do convite para a página pública /convite/[token]. Só o servidor (service role) chama.
create or replace function public.get_invitation_preview(p_token uuid)
returns table (
  workspace_nome text,
  convidado_por text,
  email text,
  role public.workspace_role,
  clientes text[],
  expirado boolean,
  aceito boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    w.nome,
    coalesce(p.nome, ''),
    i.email,
    i.role,
    coalesce(
      (select array_agg(c.nome order by c.nome) from public.clients c
       where c.workspace_id = i.workspace_id and c.id = any (i.client_ids)),
      '{}'
    ),
    i.expires_at < now(),
    i.accepted_at is not null
  from public.invitations i
  join public.workspaces w on w.id = i.workspace_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = p_token;
$$;
revoke execute on function public.get_invitation_preview(uuid) from public, anon, authenticated;
grant execute on function public.get_invitation_preview(uuid) to service_role;

-- Uso do espaço: lugares ocupados por membros e convites esperando.
drop function if exists public.workspace_usage(uuid);
create or replace function public.workspace_usage(p_workspace_id uuid)
returns table (
  plano public.plan_tier,
  max_members integer,
  max_clients integer,
  members integer,
  pending_invitations integer,
  clients integer
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
     where i.workspace_id = w.id and i.accepted_at is null and i.expires_at > now())::integer,
    (select count(*) from public.clients c where c.workspace_id = w.id and c.status <> 'encerrado')::integer
  from public.workspaces w
  join public.plan_limits l on l.plano = w.plano
  where w.id = p_workspace_id
    and public.is_workspace_member(w.id);
$$;
revoke execute on function public.workspace_usage(uuid) from public, anon;
grant execute on function public.workspace_usage(uuid) to authenticated;

-- Trocar papel: owner e admin podem mudar member <-> admin (owner é protegido por trigger existente).
-- Atribuições: owner/admin definem os clientes de cada pessoa.
create or replace function public.set_member_clients(p_workspace_id uuid, p_user_id uuid, p_client_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_admin(p_workspace_id) then
    raise exception 'Sem permissão neste workspace' using errcode = '42501';
  end if;
  if not exists (select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = p_user_id) then
    raise exception 'Pessoa não faz parte do espaço' using errcode = 'P0002';
  end if;
  delete from public.client_assignees
  where workspace_id = p_workspace_id and user_id = p_user_id
    and not (client_id = any (coalesce(p_client_ids, '{}')));
  insert into public.client_assignees (workspace_id, client_id, user_id)
  select p_workspace_id, c.id, p_user_id
  from public.clients c
  where c.workspace_id = p_workspace_id and c.id = any (coalesce(p_client_ids, '{}'))
  on conflict do nothing;
end;
$$;
revoke execute on function public.set_member_clients(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.set_member_clients(uuid, uuid, uuid[]) to authenticated;

-- Onboarding em 3 passos: o passo 1 salva nome do estúdio e modo de trabalho.
create or replace function public.save_studio_step(p_workspace_id uuid, p_nome text, p_modo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws_slug text;
  primeira boolean;
begin
  if not public.has_workspace_role(p_workspace_id, array['owner']::public.workspace_role[]) then
    raise exception 'Sem permissão neste workspace' using errcode = '42501';
  end if;
  select p.onboarded_at is null into primeira from public.profiles p where p.id = auth.uid();

  if coalesce(primeira, false) then
    perform set_config('app.allow_slug_change', 'on', true);
    update public.workspaces
    set nome = trim(p_nome), slug = public.unique_workspace_slug(p_nome), modo_trabalho = p_modo
    where id = p_workspace_id
    returning slug into ws_slug;
    perform set_config('app.allow_slug_change', 'off', true);
  else
    update public.workspaces set nome = trim(p_nome), modo_trabalho = p_modo
    where id = p_workspace_id
    returning slug into ws_slug;
  end if;
  return ws_slug;
end;
$$;
revoke execute on function public.save_studio_step(uuid, text, text) from public, anon;
grant execute on function public.save_studio_step(uuid, text, text) to authenticated;

create or replace function public.finish_onboarding()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set onboarded_at = coalesce(onboarded_at, now()) where id = auth.uid();
$$;
revoke execute on function public.finish_onboarding() from public, anon;
grant execute on function public.finish_onboarding() to authenticated;

-- Owner e admin ajustam os clientes de um convite pendente (ex.: no onboarding).
create policy "invitations: owner e admin ajustam clientes" on public.invitations
  for update to authenticated
  using ((select public.is_workspace_admin(workspace_id)) and accepted_at is null)
  with check ((select public.is_workspace_admin(workspace_id)));
grant update (client_ids, role) on public.invitations to authenticated;

-- E-mail no perfil (para a tela de Equipe). Mantido em sincronia com auth.users.
alter table public.profiles add column if not exists email text;
update public.profiles p set email = lower(u.email) from auth.users u where u.id = p.id and p.email is null;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;
revoke execute on function public.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_sync
  after insert or update of email on auth.users
  for each row execute function public.sync_profile_email();
