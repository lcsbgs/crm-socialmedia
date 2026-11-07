-- Pauta, Fase 8: publicação na Meta (Facebook e Instagram).
-- Conexões com token cifrado, contas descobertas e ligadas a clientes, fila de publicação
-- com tentativas e backoff, e registro do que foi ao ar.

create table public.social_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conectado_por uuid references public.profiles (id) on delete set null,
  provider text not null check (provider in ('facebook', 'instagram')),
  status text not null default 'ativa' check (status in ('ativa', 'expirada', 'revogada', 'erro')),
  conta_nome text,
  access_token_enc text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  simulated boolean not null default false,
  ultimo_erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger social_connections_updated_at before update on public.social_connections
  for each row execute function public.set_updated_at();

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  connection_id uuid not null references public.social_connections (id) on delete cascade,
  client_id uuid,
  plataforma text not null check (plataforma in ('instagram', 'facebook')),
  external_id text not null,
  nome text not null,
  username text,
  avatar_url text,
  page_id text, -- Instagram ligado a página: id da página dona
  created_at timestamptz not null default now(),
  unique (workspace_id, plataforma, external_id),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete set null (client_id)
);
create index social_accounts_client_idx on public.social_accounts (client_id);

create table public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  deliverable_id uuid not null references public.deliverables (id) on delete cascade,
  social_account_id uuid not null references public.social_accounts (id) on delete cascade,
  agendado_para timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente', 'processando', 'publicado', 'erro', 'cancelado')),
  tentativas integer not null default 0,
  proxima_tentativa_em timestamptz,
  erro_codigo text,
  erro_mensagem text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index publish_jobs_due_idx on public.publish_jobs (status, coalesce(proxima_tentativa_em, agendado_para));
create index publish_jobs_deliverable_idx on public.publish_jobs (deliverable_id);
create trigger publish_jobs_updated_at before update on public.publish_jobs
  for each row execute function public.set_updated_at();

create table public.published_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  deliverable_id uuid not null references public.deliverables (id) on delete cascade,
  social_account_id uuid references public.social_accounts (id) on delete set null,
  external_id text not null,
  permalink text,
  simulated boolean not null default false,
  publicado_em timestamptz not null default now()
);
create index published_posts_deliverable_idx on public.published_posts (deliverable_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.social_connections enable row level security;
alter table public.social_accounts enable row level security;
alter table public.publish_jobs enable row level security;
alter table public.published_posts enable row level security;

create policy "social_connections: membros leem" on public.social_connections
  for select to authenticated using ((select public.is_workspace_member(workspace_id)));
create policy "social_connections: admin gerencia" on public.social_connections
  for all to authenticated
  using ((select public.is_workspace_admin(workspace_id)))
  with check ((select public.is_workspace_admin(workspace_id)));

create policy "social_accounts: membros leem" on public.social_accounts
  for select to authenticated using ((select public.is_workspace_member(workspace_id)));
create policy "social_accounts: admin gerencia" on public.social_accounts
  for all to authenticated
  using ((select public.is_workspace_admin(workspace_id)))
  with check ((select public.is_workspace_admin(workspace_id)));

create policy "publish_jobs: acesso ao post" on public.publish_jobs
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_deliverable(deliverable_id));

create policy "published_posts: acesso ao post" on public.published_posts
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_deliverable(deliverable_id));

revoke all on public.social_connections, public.social_accounts, public.publish_jobs, public.published_posts from anon, authenticated;
-- Token nunca sai pela API: leitura só das colunas sem segredo.
grant select (id, workspace_id, conectado_por, provider, status, conta_nome, expires_at, scopes, simulated, ultimo_erro, created_at, updated_at)
  on public.social_connections to authenticated;
grant insert, update, delete on public.social_connections to authenticated;
grant select, insert, update, delete on public.social_accounts to authenticated;
grant select on public.publish_jobs, public.published_posts to authenticated;

-- ============================================================
-- Agendar: cria os jobs e põe o post em "agendado"
-- ============================================================
create or replace function public.schedule_deliverable(p_deliverable_id uuid, p_account_ids uuid[], p_quando timestamptz)
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
  if d.status not in ('aprovado', 'agendado', 'produzir', 'em_aprovacao', 'ajuste', 'planejar') then
    raise exception 'Este post já foi publicado' using errcode = '22023';
  end if;
  if coalesce(array_length(p_account_ids, 1), 0) = 0 then
    raise exception 'Escolha onde publicar' using errcode = '22023';
  end if;
  if p_quando < now() - interval '5 minutes' then
    raise exception 'Escolha um horário no futuro' using errcode = '22023';
  end if;

  update public.publish_jobs set status = 'cancelado'
  where deliverable_id = d.id and status in ('pendente', 'erro');

  insert into public.publish_jobs (workspace_id, deliverable_id, social_account_id, agendado_para)
  select d.workspace_id, d.id, a.id, p_quando
  from public.social_accounts a
  where a.id = any (p_account_ids) and a.workspace_id = d.workspace_id and a.client_id = d.client_id;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Nenhuma conta deste cliente foi escolhida' using errcode = '22023';
  end if;

  update public.deliverables
  set status = 'agendado',
      data_publicacao = (p_quando at time zone 'America/Sao_Paulo')::date,
      hora_publicacao = (p_quando at time zone 'America/Sao_Paulo')::time
  where id = d.id;
  return n;
end;
$$;
revoke execute on function public.schedule_deliverable(uuid, uuid[], timestamptz) from public, anon;
grant execute on function public.schedule_deliverable(uuid, uuid[], timestamptz) to authenticated;

create or replace function public.cancel_schedule(p_deliverable_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_access_deliverable(p_deliverable_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  update public.publish_jobs set status = 'cancelado'
  where deliverable_id = p_deliverable_id and status in ('pendente', 'erro');
  update public.deliverables set status = 'aprovado' where id = p_deliverable_id and status = 'agendado';
end;
$$;
revoke execute on function public.cancel_schedule(uuid) from public, anon;
grant execute on function public.cancel_schedule(uuid) to authenticated;

-- ============================================================
-- Fila (só service role): pegar, concluir e falhar com backoff
-- ============================================================
create or replace function public.claim_publish_jobs(p_limit integer default 10)
returns setof public.publish_jobs
language sql
security definer
set search_path = ''
as $$
  update public.publish_jobs j
  set status = 'processando', tentativas = j.tentativas + 1
  where j.id in (
    select id from public.publish_jobs
    where status = 'pendente'
      and coalesce(proxima_tentativa_em, agendado_para) <= now()
    order by coalesce(proxima_tentativa_em, agendado_para)
    limit p_limit
    for update skip locked
  )
  returning j.*;
$$;

create or replace function public.complete_publish_job(p_job_id uuid, p_external_id text, p_permalink text, p_simulated boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.publish_jobs;
begin
  update public.publish_jobs set status = 'publicado', erro_codigo = null, erro_mensagem = null
  where id = p_job_id returning * into j;
  if j.id is null then
    raise exception 'Job não encontrado' using errcode = 'P0002';
  end if;
  insert into public.published_posts (workspace_id, deliverable_id, social_account_id, external_id, permalink, simulated)
  values (j.workspace_id, j.deliverable_id, j.social_account_id, p_external_id, p_permalink, p_simulated);
  -- Post vai para Publicado quando todos os destinos saíram.
  if not exists (select 1 from public.publish_jobs
                 where deliverable_id = j.deliverable_id and status in ('pendente', 'processando', 'erro')) then
    update public.deliverables set status = 'publicado' where id = j.deliverable_id;
  end if;
end;
$$;

-- Backoff: 1, 5, 15, 60 minutos; na 5ª falha (ou erro não recuperável) para e avisa a equipe.
create or replace function public.fail_publish_job(p_job_id uuid, p_codigo text, p_mensagem text, p_recuperavel boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.publish_jobs;
  espera integer[] := array[1, 5, 15, 60];
  nome text;
  cliente text;
begin
  select * into j from public.publish_jobs where id = p_job_id for update;
  if j.id is null then
    raise exception 'Job não encontrado' using errcode = 'P0002';
  end if;
  if p_recuperavel and j.tentativas < 5 then
    update public.publish_jobs
    set status = 'pendente', erro_codigo = p_codigo, erro_mensagem = p_mensagem,
        proxima_tentativa_em = now() + make_interval(mins => espera[least(j.tentativas, 4)])
    where id = j.id;
    return;
  end if;
  update public.publish_jobs set status = 'erro', erro_codigo = p_codigo, erro_mensagem = p_mensagem where id = j.id;
  select coalesce(d.titulo, d.slot_label), c.nome into nome, cliente
  from public.deliverables d join public.clients c on c.id = d.client_id where d.id = j.deliverable_id;
  insert into public.notifications (workspace_id, user_id, tipo, titulo, corpo, deliverable_id)
  select j.workspace_id, m.user_id, 'publicacao',
         format('Não foi possível publicar "%s" (%s)', nome, cliente), p_mensagem, j.deliverable_id
  from public.workspace_members m where m.workspace_id = j.workspace_id;
end;
$$;

revoke execute on function public.claim_publish_jobs(integer) from public, anon, authenticated;
revoke execute on function public.complete_publish_job(uuid, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.fail_publish_job(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_publish_jobs(integer) to service_role;
grant execute on function public.complete_publish_job(uuid, text, text, boolean) to service_role;
grant execute on function public.fail_publish_job(uuid, text, text, boolean) to service_role;

-- Tentar de novo um job com erro (equipe).
create or replace function public.retry_publish_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.publish_jobs;
begin
  select * into j from public.publish_jobs where id = p_job_id;
  if j.id is null or not public.can_access_deliverable(j.deliverable_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  update public.publish_jobs
  set status = 'pendente', tentativas = 0, proxima_tentativa_em = now(), erro_codigo = null, erro_mensagem = null
  where id = j.id and status = 'erro';
end;
$$;
revoke execute on function public.retry_publish_job(uuid) from public, anon;
grant execute on function public.retry_publish_job(uuid) to authenticated;

-- Leitura do token cifrado pelo servidor (jobs e callbacks), só service role.
create or replace function public.get_social_connection_secret(p_connection_id uuid)
returns table (access_token_enc text, expires_at timestamptz, simulated boolean, provider text)
language sql
stable
security definer
set search_path = ''
as $$
  select access_token_enc, expires_at, simulated, provider from public.social_connections where id = p_connection_id;
$$;
revoke execute on function public.get_social_connection_secret(uuid) from public, anon, authenticated;
grant execute on function public.get_social_connection_secret(uuid) to service_role;
