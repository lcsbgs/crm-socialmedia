-- Pauta, Fase 6: posts e IA.
-- Etapas novas ("ajuste pedido" e "agendado"), campos do editor, versões do post,
-- uso de IA por plano e conexões de IA por pessoa (tokens cifrados).

alter type public.deliverable_status add value if not exists 'ajuste' after 'em_aprovacao';
alter type public.deliverable_status add value if not exists 'agendado' after 'aprovado';

alter table public.deliverables
  add column if not exists pilar text,
  add column if not exists prazo_interno date,
  add column if not exists rodadas integer not null default 0 check (rodadas >= 0),
  add column if not exists checklist jsonb not null default '[]'::jsonb,
  add column if not exists canal text not null default 'instagram' check (canal in ('instagram', 'facebook', 'ambos')),
  add column if not exists versao_atual integer not null default 0;

-- ============================================================
-- Versões do post (arte + legenda), numeradas por post
-- ============================================================
create table public.deliverable_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  deliverable_id uuid not null references public.deliverables (id) on delete cascade,
  numero integer not null,
  midia_paths text[] not null default '{}',
  legenda text,
  origem text not null default 'upload' check (origem in ('upload', 'canva', 'drive', 'edicao')),
  observacao text,
  criado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (deliverable_id, numero)
);
create index deliverable_versions_deliverable_idx on public.deliverable_versions (deliverable_id, numero desc);

alter table public.deliverable_versions enable row level security;
create policy "deliverable_versions: acesso ao post" on public.deliverable_versions
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_deliverable(deliverable_id));
revoke all on public.deliverable_versions from anon, authenticated;
grant select on public.deliverable_versions to authenticated;

-- Nova versão: número sequencial por post, guarda arte e legenda atuais.
create or replace function public.create_deliverable_version(
  p_deliverable_id uuid,
  p_origem text default 'edicao',
  p_observacao text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deliverables;
  n integer;
begin
  if not public.can_access_deliverable(p_deliverable_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  select * into d from public.deliverables where id = p_deliverable_id for update;
  n := d.versao_atual + 1;
  insert into public.deliverable_versions (workspace_id, deliverable_id, numero, midia_paths, legenda, origem, observacao, criado_por)
  values (d.workspace_id, d.id, n, coalesce(d.midia_urls, '{}'), d.legenda, p_origem, p_observacao, auth.uid());
  update public.deliverables set versao_atual = n where id = d.id;
  return n;
end;
$$;
revoke execute on function public.create_deliverable_version(uuid, text, text) from public, anon;
grant execute on function public.create_deliverable_version(uuid, text, text) to authenticated;

-- ============================================================
-- IA: créditos por plano, uso e conexões
-- ============================================================
alter table public.plan_limits add column if not exists ai_credits_month integer not null default 100;
update public.plan_limits set ai_credits_month = case plano when 'free' then 100 when 'pro' then 1000 else 3000 end;

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  provider text not null check (provider in ('anthropic', 'chatgpt', 'mock')),
  tarefa text not null,
  prompt_versao text,
  tokens_entrada integer not null default 0,
  tokens_saida integer not null default 0,
  creditos integer not null default 0,
  fallback boolean not null default false,
  created_at timestamptz not null default now()
);
create index ai_usage_ws_idx on public.ai_usage (workspace_id, created_at desc);

alter table public.ai_usage enable row level security;
create policy "ai_usage: membros leem" on public.ai_usage
  for select to authenticated using ((select public.is_workspace_member(workspace_id)));
create policy "ai_usage: registra o próprio uso" on public.ai_usage
  for insert to authenticated
  with check ((select public.is_workspace_member(workspace_id)) and user_id = (select auth.uid()));
revoke all on public.ai_usage from anon, authenticated;
grant select, insert on public.ai_usage to authenticated;

-- Conexão de IA por pessoa (plano do ChatGPT). Tokens cifrados no servidor (AES-256-GCM);
-- as colunas de token não podem ser lidas pela API: só pela função do próprio dono.
create table public.ai_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'chatgpt' check (provider in ('chatgpt')),
  status text not null default 'ativa' check (status in ('ativa', 'limite', 'inelegivel', 'revogada')),
  conta text,
  access_token_enc text,
  refresh_token_enc text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  simulated boolean not null default false,
  limite_aviso_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);
create trigger ai_connections_updated_at before update on public.ai_connections
  for each row execute function public.set_updated_at();

alter table public.ai_connections enable row level security;
create policy "ai_connections: dono lê" on public.ai_connections
  for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_connections: dono cria" on public.ai_connections
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "ai_connections: dono atualiza" on public.ai_connections
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "ai_connections: dono remove" on public.ai_connections
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.ai_connections from anon, authenticated;
grant select (id, user_id, provider, status, conta, expires_at, scopes, simulated, limite_aviso_em, created_at, updated_at)
  on public.ai_connections to authenticated;
grant insert, update, delete on public.ai_connections to authenticated;

create or replace function public.get_ai_connection_secret(p_provider text)
returns table (access_token_enc text, refresh_token_enc text, expires_at timestamptz, simulated boolean, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.access_token_enc, c.refresh_token_enc, c.expires_at, c.simulated, c.status
  from public.ai_connections c
  where c.user_id = auth.uid() and c.provider = p_provider;
$$;
revoke execute on function public.get_ai_connection_secret(text) from public, anon;
grant execute on function public.get_ai_connection_secret(text) to authenticated;

-- Quem do espaço usa o ChatGPT (para a tela de Equipe), sem expor tokens.
create or replace function public.workspace_ai_connections(p_workspace_id uuid)
returns table (user_id uuid, provider text, status text, simulated boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.user_id, c.provider, c.status, c.simulated
  from public.ai_connections c
  join public.workspace_members m on m.user_id = c.user_id and m.workspace_id = p_workspace_id
  where public.is_workspace_member(p_workspace_id);
$$;
revoke execute on function public.workspace_ai_connections(uuid) from public, anon;
grant execute on function public.workspace_ai_connections(uuid) to authenticated;

-- Créditos de IA do mês.
create or replace function public.ai_credits_status(p_workspace_id uuid)
returns table (usados integer, limite integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select sum(u.creditos)::integer from public.ai_usage u
              where u.workspace_id = p_workspace_id
                and u.created_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'), 0),
    l.ai_credits_month
  from public.workspaces w
  join public.plan_limits l on l.plano = w.plano
  where w.id = p_workspace_id and public.is_workspace_member(p_workspace_id);
$$;
revoke execute on function public.ai_credits_status(uuid) from public, anon;
grant execute on function public.ai_credits_status(uuid) to authenticated;
