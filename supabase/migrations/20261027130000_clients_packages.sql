-- Clientes, pacotes, tarefas, cobranças e geração mensal.

create type public.client_status as enum ('ativo', 'pausado', 'encerrado');
create type public.package_cadence as enum ('diaria', 'semanal', 'mensal');
create type public.task_type as enum ('recorrente', 'avulsa', 'reuniao');
create type public.task_status as enum ('pendente', 'feita');
create type public.task_origin as enum ('template', 'ata', 'manual');
create type public.payment_status as enum ('pendente', 'pago', 'atrasado');

-- ============================================================
-- Tabelas
-- ============================================================

-- itens: [{ "tipo": "Post", "quantidade": 3, "cadencia": "semanal" }]
create table public.package_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  itens jsonb not null default '[]'::jsonb check (jsonb_typeof(itens) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create index package_templates_workspace_id_idx on public.package_templates (workspace_id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 120),
  segmento text,
  briefing text,
  tom_de_voz text,
  contatos jsonb not null default '[]'::jsonb check (jsonb_typeof(contatos) = 'array'),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  package_template_id uuid,
  valor_mensal numeric(12, 2) check (valor_mensal is null or valor_mensal >= 0),
  dia_vencimento smallint check (dia_vencimento between 1 and 31),
  status public.client_status not null default 'ativo',
  inicio_contrato date,
  portal_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  -- O pacote precisa ser do mesmo workspace.
  foreign key (package_template_id, workspace_id)
    references public.package_templates (id, workspace_id)
    on delete set null (package_template_id)
);

create index clients_workspace_id_idx on public.clients (workspace_id);
create index clients_package_template_id_idx on public.clients (package_template_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid,
  titulo text not null check (char_length(trim(titulo)) between 1 and 200),
  tipo public.task_type not null default 'avulsa',
  due_date date,
  status public.task_status not null default 'pendente',
  origem public.task_origin not null default 'manual',
  meeting_id uuid, -- FK adicionada na migration de reuniões
  competencia date check (competencia = date_trunc('month', competencia)::date),
  -- Identifica a tarefa gerada pelo pacote dentro da competência (idempotência).
  template_key text,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, workspace_id)
    references public.clients (id, workspace_id) on delete cascade
);

create index tasks_workspace_id_idx on public.tasks (workspace_id);
create index tasks_client_id_idx on public.tasks (client_id);
create index tasks_workspace_due_idx on public.tasks (workspace_id, status, due_date);
create unique index tasks_template_unique_idx
  on public.tasks (client_id, competencia, template_key)
  where origem = 'template';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  competencia date not null check (competencia = date_trunc('month', competencia)::date),
  valor numeric(12, 2) not null check (valor >= 0),
  vencimento date not null,
  pago_em date,
  status public.payment_status not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, competencia),
  foreign key (client_id, workspace_id)
    references public.clients (id, workspace_id) on delete cascade
);

create index payments_workspace_id_idx on public.payments (workspace_id);
create index payments_client_id_idx on public.payments (client_id);
create index payments_workspace_vencimento_idx on public.payments (workspace_id, status, vencimento);

create trigger package_templates_updated_at before update on public.package_templates
  for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- done_at acompanha o status da tarefa.
create or replace function public.set_task_done_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'feita' and (tg_op = 'INSERT' or old.status <> 'feita') then
    new.done_at := coalesce(new.done_at, now());
  elsif new.status <> 'feita' then
    new.done_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_done_at before insert or update of status on public.tasks
  for each row execute function public.set_task_done_at();

-- ============================================================
-- Limite de clientes por plano (clientes encerrados não contam)
-- ============================================================

create or replace function public.enforce_client_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  limite integer;
  em_uso integer;
begin
  -- Autoriza antes de revelar qualquer informação sobre o limite.
  if coalesce(auth.role(), '') in ('authenticated', 'anon')
     and not public.is_workspace_member(new.workspace_id) then
    raise exception 'Sem permissão neste workspace' using errcode = '42501';
  end if;

  if new.status = 'encerrado' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status <> 'encerrado' then
    return new;
  end if;

  select l.max_clients into limite
  from public.workspaces w
  join public.plan_limits l on l.plano = w.plano
  where w.id = new.workspace_id
  for update of w;

  if limite is null then
    return new;
  end if;

  select count(*) into em_uso
  from public.clients c
  where c.workspace_id = new.workspace_id
    and c.status <> 'encerrado'
    and c.id <> new.id;

  if em_uso >= limite then
    raise exception 'Limite de % cliente(s) do plano atingido', limite
      using errcode = 'P0001', hint = 'PLAN_LIMIT_CLIENTS';
  end if;
  return new;
end;
$$;

create trigger clients_enforce_limit before insert or update of status on public.clients
  for each row execute function public.enforce_client_limit();

-- Uso do workspace agora inclui clientes ativos/pausados.
drop function public.workspace_usage(uuid);
create function public.workspace_usage(p_workspace_id uuid)
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
    (select count(*) from public.clients c
     where c.workspace_id = w.id and c.status <> 'encerrado')::integer
  from public.workspaces w
  join public.plan_limits l on l.plano = w.plano
  where w.id = p_workspace_id
    and public.is_workspace_member(w.id);
$$;

-- ============================================================
-- Geração do mês
-- ============================================================

-- Datas em que um item do pacote vence dentro do mês.
-- mensal: N datas espalhadas pelo mês. semanal: N por semana (seg a sex).
-- diaria: N por dia útil.
create or replace function public.package_item_dates(
  p_competencia date,
  p_cadencia public.package_cadence,
  p_quantidade integer
)
returns setof date
language plpgsql
immutable
set search_path = ''
as $$
declare
  inicio date := date_trunc('month', p_competencia)::date;
  fim date := (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date;
  dias integer := fim - inicio + 1;
  semana date;
  dia date;
  i integer;
begin
  if p_quantidade is null or p_quantidade < 1 then
    return;
  end if;

  if p_cadencia = 'mensal' then
    for i in 1..p_quantidade loop
      return next inicio + ((2 * i - 1) * dias / (2 * p_quantidade));
    end loop;

  elsif p_cadencia = 'semanal' then
    -- Segundas-feiras que caem no mês (a semana pertence ao mês da sua segunda).
    semana := inicio + ((8 - extract(isodow from inicio)::integer) % 7);
    while semana <= fim loop
      for i in 1..p_quantidade loop
        -- A última semana pode terminar no mês seguinte: limita ao fim do mês.
        return next least(semana + ((i - 1) * 5 / p_quantidade), fim);
      end loop;
      semana := semana + 7;
    end loop;

  else -- diaria
    dia := inicio;
    while dia <= fim loop
      if extract(isodow from dia) < 6 then
        for i in 1..p_quantidade loop
          return next dia;
        end loop;
      end if;
      dia := dia + 1;
    end loop;
  end if;
end;
$$;

-- Cria as tarefas recorrentes e as cobranças do mês para cada cliente ativo.
-- Idempotente: rodar de novo não duplica nada.
create or replace function public.generate_month(p_workspace_id uuid, p_competencia date)
returns table (tarefas_criadas integer, cobrancas_criadas integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  comp date := date_trunc('month', p_competencia)::date;
  fim date := (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date;
  n_tarefas integer := 0;
  n_cobrancas integer := 0;
begin
  -- Pela API, só membros. Sem auth (pg_cron/SQL direto), liberado.
  if coalesce(auth.role(), '') in ('authenticated', 'anon')
     and not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sem permissão neste workspace' using errcode = '42501';
  end if;

  with clientes as (
    select c.id, c.workspace_id, p.itens
    from public.clients c
    join public.package_templates p
      on p.id = c.package_template_id and p.workspace_id = c.workspace_id
    where c.workspace_id = p_workspace_id
      and c.status = 'ativo'
      and (c.inicio_contrato is null or c.inicio_contrato <= fim)
  ),
  itens as (
    select
      cl.id as client_id,
      cl.workspace_id,
      item.ord,
      coalesce(nullif(trim(item.value ->> 'tipo'), ''), 'Entrega') as tipo,
      greatest(coalesce((item.value ->> 'quantidade')::integer, 0), 0) as quantidade,
      coalesce((item.value ->> 'cadencia')::public.package_cadence, 'mensal') as cadencia
    from clientes cl
    cross join lateral jsonb_array_elements(cl.itens) with ordinality as item(value, ord)
  ),
  datas as (
    select
      it.*,
      d.due_date,
      row_number() over (partition by it.client_id, it.ord order by d.due_date) as seq,
      count(*) over (partition by it.client_id, it.ord) as total
    from itens it
    cross join lateral public.package_item_dates(comp, it.cadencia, it.quantidade) as d(due_date)
  ),
  inseridas as (
    insert into public.tasks (
      workspace_id, client_id, titulo, tipo, due_date, origem, competencia, template_key
    )
    select
      workspace_id,
      client_id,
      format('%s %s/%s', tipo, seq, total),
      'recorrente',
      due_date,
      'template',
      comp,
      format('%s:%s', ord, seq)
    from datas
    on conflict (client_id, competencia, template_key) where origem = 'template' do nothing
    returning 1
  )
  select count(*) into n_tarefas from inseridas;

  with inseridas as (
    insert into public.payments (workspace_id, client_id, competencia, valor, vencimento)
    select
      c.workspace_id,
      c.id,
      comp,
      c.valor_mensal,
      comp + (least(coalesce(c.dia_vencimento, 10), extract(day from fim)::integer) - 1)
    from public.clients c
    where c.workspace_id = p_workspace_id
      and c.status = 'ativo'
      and c.valor_mensal > 0
      and (c.inicio_contrato is null or c.inicio_contrato <= fim)
    on conflict (client_id, competencia) do nothing
    returning 1
  )
  select count(*) into n_cobrancas from inseridas;

  -- Aproveita para marcar cobranças vencidas.
  update public.payments
  set status = 'atrasado'
  where workspace_id = p_workspace_id
    and status = 'pendente'
    and vencimento < (now() at time zone 'America/Sao_Paulo')::date;

  return query select n_tarefas, n_cobrancas;
end;
$$;

-- Agendamento futuro (pg_cron), todo dia 1 às 06:00 UTC, para todos os workspaces:
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'generate-month',
--   '0 6 1 * *',
--   $$ select public.generate_month(w.id, current_date) from public.workspaces w $$
-- );

-- ============================================================
-- RLS: membros do workspace têm acesso total aos dados de negócio
-- ============================================================

alter table public.package_templates enable row level security;
alter table public.clients enable row level security;
alter table public.tasks enable row level security;
alter table public.payments enable row level security;

create policy "package_templates: membros" on public.package_templates
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)))
  with check ((select public.is_workspace_member(workspace_id)));

create policy "clients: membros" on public.clients
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)))
  with check ((select public.is_workspace_member(workspace_id)));

create policy "tasks: membros" on public.tasks
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)))
  with check ((select public.is_workspace_member(workspace_id)));

create policy "payments: membros" on public.payments
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)))
  with check ((select public.is_workspace_member(workspace_id)));

revoke all on public.package_templates, public.clients, public.tasks, public.payments
  from anon, authenticated;
grant select, insert, update, delete
  on public.package_templates, public.clients, public.tasks, public.payments
  to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_workspace_member(uuid),
  public.has_workspace_role(uuid, public.workspace_role[]),
  public.shares_workspace_with(uuid),
  public.create_workspace(text),
  public.complete_onboarding(text, text),
  public.get_invitation(uuid),
  public.accept_invitation(uuid),
  public.slugify(text),
  public.workspace_usage(uuid),
  public.generate_month(uuid, date)
to authenticated;
