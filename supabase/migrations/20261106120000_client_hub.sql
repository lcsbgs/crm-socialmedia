-- Pauta, Fase 4: página do cliente.
-- Estratégia, kit da marca (com link só leitura), arquivos, checklist de onboarding,
-- briefing público por token e eventos manuais na linha do tempo.

-- ============================================================
-- Clientes: campos novos
-- ============================================================
alter table public.clients
  add column if not exists onboarding_checklist jsonb not null default '[]'::jsonb,
  add column if not exists briefing_token uuid not null default gen_random_uuid(),
  add column if not exists briefing_respostas jsonb,
  add column if not exists briefing_respondido_em timestamptz,
  add column if not exists instagram_handle text,
  add column if not exists drive_folder_url text;
create unique index if not exists clients_briefing_token_idx on public.clients (briefing_token);

-- ============================================================
-- Estratégia (uma por cliente)
-- ============================================================
create table public.client_strategies (
  client_id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  objetivo text,
  publico text,
  objetivos jsonb not null default '[]'::jsonb,   -- [{ texto, prazo }]
  pilares jsonb not null default '[]'::jsonb,     -- [{ nome, pct }]
  formatos jsonb not null default '[]'::jsonb,    -- [{ formato, frequencia }]
  decisoes jsonb not null default '[]'::jsonb,    -- [{ data, texto, origem }]
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade
);
create trigger client_strategies_updated_at before update on public.client_strategies
  for each row execute function public.set_updated_at();

-- ============================================================
-- Kit da marca (um por cliente) com link só leitura
-- ============================================================
create table public.brand_kits (
  client_id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  cores jsonb not null default '[]'::jsonb,       -- [{ hex, nome }]
  fontes text,
  tom text[] not null default '{}',
  evitar text[] not null default '{}',
  observacoes text,
  share_token uuid not null default gen_random_uuid() unique,
  share_ativo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade
);
create trigger brand_kits_updated_at before update on public.brand_kits
  for each row execute function public.set_updated_at();

-- ============================================================
-- Arquivos do cliente (Storage: bucket midia, pasta {workspace}/clientes/{cliente}/...)
-- ============================================================
create table public.client_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  categoria text not null default 'geral' check (categoria in ('geral', 'marca', 'briefing', 'contrato')),
  nome text not null,
  path text not null,
  mime text,
  tamanho bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade
);
create index client_files_client_idx on public.client_files (client_id, categoria, created_at desc);

-- ============================================================
-- Eventos manuais e de sistema da linha do tempo
-- ============================================================
create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  tipo text not null default 'nota',
  titulo text not null check (char_length(titulo) between 1 and 300),
  corpo text,
  ocorreu_em timestamptz not null default now(),
  autor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade
);
create index timeline_events_client_idx on public.timeline_events (client_id, ocorreu_em desc);

-- ============================================================
-- RLS: quem tem acesso ao cliente
-- ============================================================
alter table public.client_strategies enable row level security;
alter table public.brand_kits enable row level security;
alter table public.client_files enable row level security;
alter table public.timeline_events enable row level security;

create policy "client_strategies: acesso ao cliente" on public.client_strategies
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id))
  with check ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id));

create policy "brand_kits: acesso ao cliente" on public.brand_kits
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id))
  with check ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id));

create policy "client_files: acesso ao cliente" on public.client_files
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id))
  with check ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id));

create policy "timeline_events: acesso ao cliente leem" on public.timeline_events
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id));
create policy "timeline_events: acesso ao cliente registram" on public.timeline_events
  for insert to authenticated
  with check (
    (select public.is_workspace_member(workspace_id))
    and public.can_access_client(client_id)
    and autor_id = (select auth.uid())
  );
create policy "timeline_events: autor apaga" on public.timeline_events
  for delete to authenticated
  using (autor_id = (select auth.uid()));

revoke all on public.client_strategies, public.brand_kits, public.client_files, public.timeline_events from anon, authenticated;
grant select, insert, update, delete on public.client_strategies, public.brand_kits, public.client_files to authenticated;
grant select, insert, delete on public.timeline_events to authenticated;

-- ============================================================
-- Briefing público e kit da marca público (só service role, via servidor)
-- ============================================================
create or replace function public.get_briefing_form(p_token uuid)
returns table (client_nome text, workspace_nome text, respondido_em timestamptz, respostas jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select c.nome, w.nome, c.briefing_respondido_em, c.briefing_respostas
  from public.clients c
  join public.workspaces w on w.id = c.workspace_id
  where c.briefing_token = p_token and c.status <> 'encerrado';
$$;

create or replace function public.submit_briefing(p_token uuid, p_respostas jsonb, p_nome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.clients;
begin
  select * into c from public.clients where briefing_token = p_token and status <> 'encerrado' for update;
  if c.id is null then
    raise exception 'Briefing não encontrado' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_respostas) <> 'object' then
    raise exception 'Respostas inválidas' using errcode = '22023';
  end if;
  update public.clients
  set briefing_respostas = p_respostas, briefing_respondido_em = now()
  where id = c.id;
  insert into public.timeline_events (workspace_id, client_id, tipo, titulo)
  values (c.workspace_id, c.id, 'briefing', 'Briefing respondido' || coalesce(' por ' || nullif(trim(p_nome), ''), ''));
end;
$$;

create or replace function public.get_brand_kit_public(p_token uuid)
returns table (
  workspace_id uuid,
  client_id uuid,
  client_nome text,
  client_cor integer,
  workspace_nome text,
  cores jsonb,
  fontes text,
  tom text[],
  evitar text[],
  observacoes text
)
language sql
stable
security definer
set search_path = ''
as $$
  select k.workspace_id, k.client_id, c.nome, c.cor, w.nome, k.cores, k.fontes, k.tom, k.evitar, k.observacoes
  from public.brand_kits k
  join public.clients c on c.id = k.client_id
  join public.workspaces w on w.id = k.workspace_id
  where k.share_token = p_token and k.share_ativo;
$$;

revoke execute on function public.get_briefing_form(uuid) from public, anon, authenticated;
revoke execute on function public.submit_briefing(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.get_brand_kit_public(uuid) from public, anon, authenticated;
grant execute on function public.get_briefing_form(uuid) to service_role;
grant execute on function public.submit_briefing(uuid, jsonb, text) to service_role;
grant execute on function public.get_brand_kit_public(uuid) to service_role;

-- Novo link de briefing (invalida o anterior).
create or replace function public.regenerate_briefing_token(p_client_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  novo uuid := gen_random_uuid();
begin
  if not public.can_access_client(p_client_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  update public.clients set briefing_token = novo where id = p_client_id;
  return novo;
end;
$$;
revoke execute on function public.regenerate_briefing_token(uuid) from public, anon;
grant execute on function public.regenerate_briefing_token(uuid) to authenticated;

-- ============================================================
-- Linha do tempo: inclui os eventos registrados
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
       'entrega_criada', 'Post criado: ' || coalesce(d.titulo, d.slot_label), d.id
from public.deliverables d
where d.slot_key is null

union all
select d.workspace_id, d.client_id, d.status_changed_at,
       'entrega_' || d.status::text,
       case d.status
         when 'em_aprovacao' then 'Enviado para aprovação: '
         when 'aprovado' then 'Post aprovado: '
         else 'Post publicado: '
       end || coalesce(d.titulo, d.slot_label),
       d.id
from public.deliverables d
where d.status in ('em_aprovacao', 'aprovado', 'publicado')

union all
select a.workspace_id, d.client_id, a.created_at,
       'aprovacao_' || a.decisao::text,
       case a.decisao when 'aprovado' then a.autor_nome || ' aprovou "' else 'Ajuste pedido em "' end
         || coalesce(d.titulo, d.slot_label) || '"'
         || case when a.decisao = 'ajuste' then coalesce(': ' || a.comentario, '') else '' end,
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
where s.resolvido_em is not null

union all
select e.workspace_id, e.client_id, e.ocorreu_em, e.tipo, e.titulo, e.id
from public.timeline_events e;

revoke all on public.client_timeline from anon, authenticated;
grant select on public.client_timeline to authenticated;

-- Storage: arquivos em {workspace}/clientes/{cliente}/... exigem acesso ao cliente.
create or replace function public.can_access_media(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pasta text := split_part(p_name, '/', 1);
  sub text := split_part(p_name, '/', 2);
  cliente text := split_part(p_name, '/', 3);
  uuid_re text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if pasta !~ uuid_re then
    return false;
  end if;
  if not public.is_workspace_member(pasta::uuid) then
    return false;
  end if;
  if sub = 'clientes' then
    return cliente ~ uuid_re and public.can_access_client(cliente::uuid);
  end if;
  return true;
end;
$$;
