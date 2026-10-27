-- Multi-tenant: perfis, workspaces, membros, convites e limites por plano.

-- ============================================================
-- Tabelas
-- ============================================================

create table public.plan_limits (
  plano public.plan_tier primary key,
  max_members integer not null check (max_members > 0),
  max_clients integer check (max_clients is null or max_clients > 0), -- null = ilimitado
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plan_limits (plano, max_members, max_clients) values
  ('free', 1, 2),
  ('pro', 2, 12),
  ('estudio', 5, null);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  owner_id uuid not null references auth.users (id) on delete cascade,
  plano public.plan_tier not null default 'free' references public.plan_limits (plano),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspaces_owner_id_idx on public.workspaces (owner_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  avatar_url text,
  last_workspace_id uuid references public.workspaces (id) on delete set null,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%@%'),
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invitations_workspace_id_idx on public.invitations (workspace_id);
-- Um convite em aberto por e-mail em cada workspace.
create unique index invitations_pending_email_idx
  on public.invitations (workspace_id, email)
  where accepted_at is null;

create trigger plan_limits_updated_at before update on public.plan_limits
  for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger workspace_members_updated_at before update on public.workspace_members
  for each row execute function public.set_updated_at();
create trigger invitations_updated_at before update on public.invitations
  for each row execute function public.set_updated_at();

-- ============================================================
-- Funções de autorização (usadas pelas policies de RLS)
-- ============================================================

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role(
  p_workspace_id uuid,
  p_roles public.workspace_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

-- Dois usuários compartilham algum workspace? Usada para ler perfis de colegas.
create or replace function public.shares_workspace_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

-- ============================================================
-- Criação de workspace e usuário
-- ============================================================

create or replace function public.unique_workspace_slug(p_nome text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  base text := trim(both '-' from left(public.slugify(p_nome), 40));
  candidate text;
begin
  if base = '' then
    base := 'workspace';
  end if;
  candidate := base;
  -- "novo" é rota da aplicação (/w/novo).
  while candidate = any (array['novo']) or exists (select 1 from public.workspaces w where w.slug = candidate) loop
    candidate := base || '-' || substr(md5(random()::text), 1, 4);
  end loop;
  return candidate;
end;
$$;

-- Cria um workspace com o usuário como owner. Uso interno.
create or replace function public.create_workspace_for(p_user_id uuid, p_nome text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws public.workspaces;
begin
  insert into public.workspaces (nome, slug, owner_id)
  values (trim(p_nome), public.unique_workspace_slug(p_nome), p_user_id)
  returning * into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws.id, p_user_id, 'owner');

  return ws;
end;
$$;

-- RPC: cria um workspace para o usuário logado.
create or replace function public.create_workspace(p_nome text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_nome, ''))) = 0 then
    raise exception 'Informe o nome do workspace' using errcode = '22023';
  end if;

  ws := public.create_workspace_for(auth.uid(), p_nome);

  update public.profiles set last_workspace_id = ws.id where id = auth.uid();
  return ws;
end;
$$;

-- Ao se cadastrar: cria o perfil e o workspace pessoal.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
  ws public.workspaces;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, nome) values (new.id, display_name);

  ws := public.create_workspace_for(new.id, 'Workspace de ' || display_name);

  update public.profiles set last_workspace_id = ws.id where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RPC do onboarding: nomeia o usuário e o workspace pessoal e gera o slug
-- a partir do nome escolhido. Só funciona uma vez.
create or replace function public.complete_onboarding(p_nome text, p_workspace_nome text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws_id uuid;
  ws_slug text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;

  select p.last_workspace_id into ws_id
  from public.profiles p
  where p.id = auth.uid() and p.onboarded_at is null;

  if ws_id is null or not public.has_workspace_role(ws_id, array['owner']::public.workspace_role[]) then
    raise exception 'Onboarding já concluído' using errcode = '22023';
  end if;

  -- Libera a troca de slug só dentro desta transação (ver protect_workspace_columns).
  perform set_config('app.allow_slug_change', 'on', true);
  update public.workspaces
  set nome = trim(p_workspace_nome),
      slug = public.unique_workspace_slug(p_workspace_nome)
  where id = ws_id
  returning slug into ws_slug;
  perform set_config('app.allow_slug_change', 'off', true);

  update public.profiles
  set nome = trim(p_nome), onboarded_at = now()
  where id = auth.uid();

  return ws_slug;
end;
$$;

-- ============================================================
-- Proteções de colunas sensíveis
-- ============================================================

-- Plano, dono e slug só mudam pelo service role ou direto no banco.
create or replace function public.protect_workspace_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') and (
    new.plano is distinct from old.plano
    or new.owner_id is distinct from old.owner_id
    or (new.slug is distinct from old.slug
        and coalesce(current_setting('app.allow_slug_change', true), '') <> 'on')
  ) then
    raise exception 'Somente o nome do workspace pode ser alterado'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workspaces_protect_columns before update on public.workspaces
  for each row execute function public.protect_workspace_columns();

-- O papel de owner não é atribuído nem retirado pela aplicação.
create or replace function public.protect_owner_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon')
     and (old.role = 'owner' or new.role = 'owner')
     and new.role is distinct from old.role then
    raise exception 'O papel de owner não pode ser alterado' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workspace_members_protect_owner before update on public.workspace_members
  for each row execute function public.protect_owner_role();

-- ============================================================
-- Convites
-- ============================================================

-- Dados do convite para a tela de aceite. Exige login; o token é o segredo.
create or replace function public.get_invitation(p_token uuid)
returns table (
  workspace_nome text,
  email text,
  role public.workspace_role,
  expirado boolean,
  aceito boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select w.nome, i.email, i.role, i.expires_at < now(), i.accepted_at is not null
  from public.invitations i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = p_token;
$$;

-- Aceita o convite do usuário logado e retorna o slug do workspace.
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
  if user_email is distinct from inv.email then
    raise exception 'Este convite foi enviado para outro e-mail' using errcode = '42501';
  end if;

  -- Marca como aceito antes de inserir, para o convite não contar duas vezes no limite.
  update public.invitations set accepted_at = now() where id = inv.id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, auth.uid(), inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.profiles set last_workspace_id = inv.workspace_id where id = auth.uid();

  select slug into ws_slug from public.workspaces where id = inv.workspace_id;
  return ws_slug;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.plan_limits enable row level security;
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;

-- plan_limits: leitura para logados.
create policy "plan_limits: leitura" on public.plan_limits
  for select to authenticated using (true);

-- workspaces: membros leem; owner e admin renomeiam; só o owner exclui.
-- Criação apenas via create_workspace().
create policy "workspaces: membros leem" on public.workspaces
  for select to authenticated
  using ((select public.is_workspace_member(id)));

create policy "workspaces: owner e admin editam" on public.workspaces
  for update to authenticated
  using ((select public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[])))
  with check ((select public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[])));

create policy "workspaces: owner exclui" on public.workspaces
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- profiles: cada um lê e edita o próprio; colegas de workspace se enxergam.
create policy "profiles: leitura própria ou de colegas" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.shares_workspace_with(id)));

create policy "profiles: edição própria" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (last_workspace_id is null or public.is_workspace_member(last_workspace_id))
  );

-- workspace_members: membros leem; owner e admin mudam papéis e removem;
-- qualquer um pode sair. O owner nunca é removido. Entrada via RPCs.
create policy "workspace_members: membros leem" on public.workspace_members
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

create policy "workspace_members: owner e admin editam papel" on public.workspace_members
  for update to authenticated
  using (
    role <> 'owner'
    and (select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  )
  with check (
    role <> 'owner'
    and (select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  );

create policy "workspace_members: remover ou sair" on public.workspace_members
  for delete to authenticated
  using (
    role <> 'owner'
    and (
      user_id = (select auth.uid())
      or (select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
    )
  );

-- invitations: owner e admin gerenciam. Aceite via accept_invitation().
create policy "invitations: owner e admin leem" on public.invitations
  for select to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

create policy "invitations: owner e admin criam" on public.invitations
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and (select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  );

create policy "invitations: owner e admin revogam" on public.invitations
  for delete to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

-- ============================================================
-- Grants: anon não acessa nada de negócio.
-- ============================================================

revoke all on public.plan_limits, public.workspaces, public.profiles,
  public.workspace_members, public.invitations from anon, authenticated;

grant select on public.plan_limits to authenticated;
grant select, update, delete on public.workspaces to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update, delete on public.workspace_members to authenticated;
grant select, insert, delete on public.invitations to authenticated;

-- O Supabase concede execute a anon/authenticated por padrão. Revogamos tudo
-- e liberamos só o que a aplicação chama.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_workspace_member(uuid),
  public.has_workspace_role(uuid, public.workspace_role[]),
  public.shares_workspace_with(uuid),
  public.create_workspace(text),
  public.complete_onboarding(text, text),
  public.get_invitation(uuid),
  public.accept_invitation(uuid),
  public.slugify(text)
to authenticated;

-- Funções criadas daqui em diante não ficam executáveis por anon/public por padrão.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
