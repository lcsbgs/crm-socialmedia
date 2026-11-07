-- Pauta, Fases 8 a 11: conexões genéricas de integrações (Google, Canva, Granola, Asaas, assinatura).
-- Pessoais (google, canva, granola): uma por pessoa e espaço. Do espaço (asaas, assinatura): uma por espaço.
-- Tokens cifrados no servidor; colunas de token sem grant de leitura.

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google', 'canva', 'granola', 'asaas', 'assinatura')),
  status text not null default 'ativa' check (status in ('ativa', 'expirada', 'revogada', 'erro')),
  conta text,
  access_token_enc text,
  refresh_token_enc text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  simulated boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((provider in ('google', 'canva', 'granola')) = (user_id is not null))
);
create unique index integration_connections_personal_idx
  on public.integration_connections (workspace_id, user_id, provider) where user_id is not null;
create unique index integration_connections_workspace_idx
  on public.integration_connections (workspace_id, provider) where user_id is null;
create trigger integration_connections_updated_at before update on public.integration_connections
  for each row execute function public.set_updated_at();

alter table public.integration_connections enable row level security;
create policy "integration_connections: ler" on public.integration_connections
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)) and (user_id is null or user_id = (select auth.uid())));
create policy "integration_connections: pessoal" on public.integration_connections
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_workspace_member(workspace_id)))
  with check (user_id = (select auth.uid()) and (select public.is_workspace_member(workspace_id)));
create policy "integration_connections: espaço" on public.integration_connections
  for all to authenticated
  using (user_id is null and (select public.is_workspace_admin(workspace_id)))
  with check (user_id is null and (select public.is_workspace_admin(workspace_id)));

revoke all on public.integration_connections from anon, authenticated;
grant select (id, workspace_id, user_id, provider, status, conta, expires_at, scopes, simulated, config, created_at, updated_at)
  on public.integration_connections to authenticated;
grant insert, update, delete on public.integration_connections to authenticated;

-- Segredo da própria conexão (pessoal do usuário ou do espaço, se admin).
create or replace function public.get_integration_secret(p_workspace_id uuid, p_provider text)
returns table (id uuid, access_token_enc text, refresh_token_enc text, expires_at timestamptz, simulated boolean, config jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.access_token_enc, c.refresh_token_enc, c.expires_at, c.simulated, c.config
  from public.integration_connections c
  where c.workspace_id = p_workspace_id and c.provider = p_provider
    and public.is_workspace_member(p_workspace_id)
    and (c.user_id = auth.uid() or (c.user_id is null and public.is_workspace_admin(p_workspace_id)))
  order by c.user_id nulls last
  limit 1;
$$;
revoke execute on function public.get_integration_secret(uuid, text) from public, anon;
grant execute on function public.get_integration_secret(uuid, text) to authenticated;
