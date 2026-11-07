-- Pauta, Fase 7: portal do cliente.
-- Resposta com IP, versão e ponto na imagem; aprovar todos; planejamento do mês aprovável;
-- lembrete depois de 48 h; aprovação tácita opcional; rodadas com limite viram sugestão de escopo extra.

alter table public.approvals
  add column if not exists ip text,
  add column if not exists user_agent text,
  add column if not exists versao integer,
  add column if not exists ponto jsonb; -- { x: 0..100, y: 0..100 } em % da imagem

alter table public.clients
  add column if not exists aprovacao_tacita_horas integer check (aprovacao_tacita_horas is null or aprovacao_tacita_horas between 24 and 720);

alter table public.deliverables
  add column if not exists lembrete_em timestamptz;

alter table public.notifications drop constraint if exists notifications_tipo_check;
alter table public.notifications
  add constraint notifications_tipo_check
  check (tipo in ('aprovacao', 'ajuste', 'lembrete', 'escopo', 'planejamento', 'publicacao', 'pagamento', 'proposta', 'sistema'));

-- ============================================================
-- Planejamento do mês enviado ao cliente
-- ============================================================
create table public.month_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  competencia date not null,
  status text not null default 'enviado' check (status in ('enviado', 'aprovado', 'ajuste')),
  enviado_em timestamptz not null default now(),
  respondido_em timestamptz,
  autor_nome text,
  comentario text,
  ip text,
  created_at timestamptz not null default now(),
  unique (client_id, competencia),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade
);

alter table public.month_plans enable row level security;
create policy "month_plans: acesso ao cliente" on public.month_plans
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)) and public.can_access_client(client_id));
revoke all on public.month_plans from anon, authenticated;
grant select on public.month_plans to authenticated;

create or replace function public.send_month_plan(p_client_id uuid, p_competencia date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
begin
  if not public.can_access_client(p_client_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  select workspace_id into ws from public.clients where id = p_client_id;
  insert into public.month_plans (workspace_id, client_id, competencia)
  values (ws, p_client_id, date_trunc('month', p_competencia)::date)
  on conflict (client_id, competencia)
  do update set status = 'enviado', enviado_em = now(), respondido_em = null, comentario = null, autor_nome = null;
end;
$$;
revoke execute on function public.send_month_plan(uuid, date) from public, anon;
grant execute on function public.send_month_plan(uuid, date) to authenticated;

-- ============================================================
-- Resposta do cliente a um post
-- ============================================================
drop function if exists public.portal_respond(uuid, uuid, public.approval_decision, text, text);

create or replace function public.portal_respond(
  p_token uuid,
  p_deliverable_id uuid,
  p_decisao public.approval_decision,
  p_comentario text,
  p_autor_nome text,
  p_ip text default null,
  p_user_agent text default null,
  p_ponto jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entrega public.deliverables;
  limite integer;
  nome text;
begin
  select d.* into entrega
  from public.deliverables d
  join public.clients c on c.id = d.client_id and c.workspace_id = d.workspace_id
  where c.portal_token = p_token
    and c.status <> 'encerrado'
    and d.id = p_deliverable_id
  for update of d;

  if entrega.id is null then
    raise exception 'Post não encontrado' using errcode = 'P0002';
  end if;
  if entrega.status <> 'em_aprovacao' then
    raise exception 'Este post não está mais esperando aprovação' using errcode = '22023';
  end if;
  if p_decisao = 'ajuste' and char_length(trim(coalesce(p_comentario, ''))) = 0 then
    raise exception 'Conte o que precisa ser ajustado' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_autor_nome, ''))) = 0 then
    raise exception 'Informe seu nome' using errcode = '22023';
  end if;

  insert into public.approvals (workspace_id, deliverable_id, decisao, comentario, autor_nome, ip, user_agent, versao, ponto)
  values (entrega.workspace_id, entrega.id, p_decisao, nullif(trim(p_comentario), ''), trim(p_autor_nome),
          left(p_ip, 64), left(p_user_agent, 300), entrega.versao_atual,
          case when p_ponto ? 'x' and p_ponto ? 'y' then p_ponto else null end);

  if p_decisao = 'aprovado' then
    update public.deliverables set status = 'aprovado' where id = entrega.id;
    return;
  end if;

  update public.deliverables set status = 'ajuste', rodadas = rodadas + 1 where id = entrega.id;

  -- Passou do limite de rodadas do pacote: sugere escopo extra (uma vez por post).
  select coalesce(p.limite_rodadas, 2) into limite
  from public.clients c
  left join public.package_templates p on p.id = c.package_template_id
  where c.id = entrega.client_id;

  if entrega.rodadas + 1 > coalesce(limite, 2)
     and not exists (select 1 from public.scope_requests s
                     where s.deliverable_id = entrega.id and s.origem = 'rodadas' and s.status = 'pendente') then
    nome := coalesce(entrega.titulo, entrega.slot_label, 'post');
    insert into public.scope_requests (workspace_id, client_id, descricao, deliverable_id, origem)
    values (entrega.workspace_id, entrega.client_id,
            format('Rodada extra de ajuste em "%s" (%s de %s)', nome, entrega.rodadas + 1, coalesce(limite, 2)),
            entrega.id, 'rodadas');
    insert into public.notifications (workspace_id, user_id, tipo, titulo, corpo, deliverable_id)
    select entrega.workspace_id, m.user_id, 'escopo',
           format('"%s" passou do limite de rodadas', nome),
           'Registramos uma sugestão de escopo extra. Decida se cobra ou absorve.', entrega.id
    from public.workspace_members m
    where m.workspace_id = entrega.workspace_id and m.role in ('owner', 'admin');
  end if;
end;
$$;
revoke execute on function public.portal_respond(uuid, uuid, public.approval_decision, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.portal_respond(uuid, uuid, public.approval_decision, text, text, text, text, jsonb)
  to service_role;

-- Aprovar todos os posts esperando de uma vez.
create or replace function public.portal_approve_all(p_token uuid, p_autor_nome text, p_ip text default null, p_user_agent text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  n integer := 0;
begin
  for d in
    select dd.id from public.deliverables dd
    join public.clients c on c.id = dd.client_id
    where c.portal_token = p_token and c.status <> 'encerrado' and dd.status = 'em_aprovacao'
  loop
    perform public.portal_respond(p_token, d.id, 'aprovado', null, p_autor_nome, p_ip, p_user_agent, null);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.portal_approve_all(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.portal_approve_all(uuid, text, text, text) to service_role;

-- Resposta ao planejamento do mês.
create or replace function public.portal_plan_respond(
  p_token uuid,
  p_competencia date,
  p_decisao text,
  p_comentario text,
  p_autor_nome text,
  p_ip text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  plano public.month_plans;
begin
  select mp.* into plano
  from public.month_plans mp
  join public.clients c on c.id = mp.client_id
  where c.portal_token = p_token and c.status <> 'encerrado'
    and mp.competencia = date_trunc('month', p_competencia)::date
  for update of mp;
  if plano.id is null then
    raise exception 'Planejamento não encontrado' using errcode = 'P0002';
  end if;
  if plano.status <> 'enviado' then
    raise exception 'Este planejamento já foi respondido' using errcode = '22023';
  end if;
  if p_decisao not in ('aprovado', 'ajuste') then
    raise exception 'Resposta inválida' using errcode = '22023';
  end if;
  if p_decisao = 'ajuste' and char_length(trim(coalesce(p_comentario, ''))) = 0 then
    raise exception 'Conte o que quer mudar no planejamento' using errcode = '22023';
  end if;
  update public.month_plans
  set status = p_decisao, respondido_em = now(), autor_nome = trim(p_autor_nome),
      comentario = nullif(trim(p_comentario), ''), ip = left(p_ip, 64)
  where id = plano.id;

  insert into public.timeline_events (workspace_id, client_id, tipo, titulo, corpo)
  values (plano.workspace_id, plano.client_id, 'planejamento',
          format('%s %s o planejamento de %s', trim(p_autor_nome),
                 case when p_decisao = 'aprovado' then 'aprovou' else 'pediu ajuste n' end,
                 to_char(plano.competencia, 'MM/YYYY')),
          nullif(trim(p_comentario), ''));

  insert into public.notifications (workspace_id, user_id, tipo, titulo, corpo)
  select plano.workspace_id, m.user_id, 'planejamento',
         format('%s %s o planejamento de %s', trim(p_autor_nome),
                case when p_decisao = 'aprovado' then 'aprovou' else 'pediu ajuste n' end,
                to_char(plano.competencia, 'MM/YYYY')),
         nullif(trim(p_comentario), '')
  from public.workspace_members m
  where m.workspace_id = plano.workspace_id;
end;
$$;
revoke execute on function public.portal_plan_respond(uuid, date, text, text, text, text) from public, anon, authenticated;
grant execute on function public.portal_plan_respond(uuid, date, text, text, text, text) to service_role;

-- ============================================================
-- Lembretes (48 h) e aprovação tácita. Job de hora em hora.
-- ============================================================
create or replace function public.run_approval_reminders()
returns table (lembretes integer, tacitas integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_lembretes integer := 0;
  n_tacitas integer := 0;
  d record;
begin
  -- Aprovação tácita: cliente optou e o prazo passou.
  for d in
    select dd.id, dd.workspace_id, c.portal_token
    from public.deliverables dd
    join public.clients c on c.id = dd.client_id
    where dd.status = 'em_aprovacao'
      and c.aprovacao_tacita_horas is not null
      and dd.status_changed_at < now() - make_interval(hours => c.aprovacao_tacita_horas)
  loop
    perform public.portal_respond(d.portal_token, d.id, 'aprovado', null, 'Aprovação tácita (sem resposta no prazo)', null, null, null);
    n_tacitas := n_tacitas + 1;
  end loop;

  -- Lembrete para a equipe: 48 h sem resposta, no máximo um a cada 48 h por post.
  with alvo as (
    update public.deliverables dd
    set lembrete_em = now()
    from public.clients c
    where c.id = dd.client_id
      and dd.status = 'em_aprovacao'
      and dd.status_changed_at < now() - interval '48 hours'
      and (dd.lembrete_em is null or dd.lembrete_em < now() - interval '48 hours')
    returning dd.id, dd.workspace_id, dd.client_id, coalesce(dd.titulo, dd.slot_label) as nome, c.nome as cliente
  ),
  avisos as (
    insert into public.notifications (workspace_id, user_id, tipo, titulo, corpo, deliverable_id)
    select a.workspace_id, m.user_id, 'lembrete',
           format('%s ainda não respondeu "%s"', a.cliente, a.nome),
           'Já são 48 horas. Que tal reenviar o link pelo WhatsApp?', a.id
    from alvo a
    join public.workspace_members m on m.workspace_id = a.workspace_id
    where m.role in ('owner', 'admin')
       or exists (select 1 from public.client_assignees ca where ca.client_id = a.client_id and ca.user_id = m.user_id)
    returning 1
  )
  select count(*) into n_lembretes from alvo;

  return query select n_lembretes, n_tacitas;
end;
$$;
revoke execute on function public.run_approval_reminders() from public, anon, authenticated;
grant execute on function public.run_approval_reminders() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'pauta-lembretes';
    perform cron.schedule('pauta-lembretes', '17 * * * *', 'select public.run_approval_reminders()');
  end if;
exception when others then
  raise notice 'pg_cron indisponível: agende run_approval_reminders() manualmente (%).', sqlerrm;
end;
$$;
