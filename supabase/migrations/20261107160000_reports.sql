-- Pauta, Fase 12: métricas diárias, relatório mensal com leitura da IA (página no portal e PDF)
-- e resumo diário opcional por e-mail.

create table public.metrics_daily (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  social_account_id uuid references public.social_accounts (id) on delete set null,
  data date not null,
  seguidores integer,
  alcance integer not null default 0,
  impressoes integer not null default 0,
  interacoes integer not null default 0,
  simulated boolean not null default false,
  created_at timestamptz not null default now(),
  unique (social_account_id, data),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade
);
create index metrics_daily_client_idx on public.metrics_daily (client_id, data);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  competencia date not null,
  resumo jsonb not null default '{}'::jsonb,
  leitura text,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  token uuid not null default gen_random_uuid() unique,
  gerado_em timestamptz not null default now(),
  publicado_em timestamptz,
  unique (client_id, competencia),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade
);
create trigger reports_updated_at before update on public.reports for each row execute function public.set_updated_at();
alter table public.reports add column if not exists updated_at timestamptz not null default now();

alter table public.profiles add column if not exists resumo_diario boolean not null default false;

alter table public.metrics_daily enable row level security;
alter table public.reports enable row level security;
create policy "metrics_daily: acesso ao cliente" on public.metrics_daily for select to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id));
create policy "reports: acesso ao cliente" on public.reports for all to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id))
  with check ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id));
revoke all on public.metrics_daily, public.reports from anon, authenticated;
grant select on public.metrics_daily to authenticated;
grant select, insert, update, delete on public.reports to authenticated;
