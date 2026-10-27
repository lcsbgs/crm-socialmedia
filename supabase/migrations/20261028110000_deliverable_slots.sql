-- Separa tarefa de entrega.
-- generate_month passa a criar slots de entrega (rascunhos sem título, com data
-- sugerida no mês) em vez de tarefas-checkbox. Tarefas ficam para ações
-- operacionais (cobrar material, enviar relatório, reunião, ata).

-- ============================================================
-- Entregas: slots, responsável
-- ============================================================

alter table public.deliverables drop constraint deliverables_titulo_check;
alter table public.deliverables alter column titulo drop not null;

alter table public.deliverables
  add column slot_label text check (slot_label is null or char_length(slot_label) <= 120),
  add column competencia date check (competencia is null or competencia = date_trunc('month', competencia)::date),
  add column slot_key text,
  add column responsavel_id uuid references public.profiles (id) on delete set null,
  add constraint deliverables_titulo_check
    check (titulo is null or char_length(trim(titulo)) between 1 and 200),
  -- Rascunho do pacote pode ficar sem título; entrega avulsa precisa de um.
  add constraint deliverables_nome_check check (titulo is not null or slot_label is not null);

create unique index deliverables_slot_unique_idx
  on public.deliverables (client_id, competencia, slot_key)
  where slot_key is not null;
create index deliverables_responsavel_id_idx on public.deliverables (responsavel_id);
create index deliverables_workspace_data_idx on public.deliverables (workspace_id, data_publicacao);

-- Responsável precisa ser membro do workspace.
create or replace function public.check_deliverable_responsavel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.responsavel_id is not null and not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = new.workspace_id and m.user_id = new.responsavel_id
  ) then
    raise exception 'Responsável precisa ser membro do workspace' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_deliverable_responsavel() from public, anon, authenticated;

create trigger deliverables_check_responsavel
  before insert or update of responsavel_id on public.deliverables
  for each row execute function public.check_deliverable_responsavel();

-- "Reels", "stories", "Relatório mensal" -> formato da entrega.
create or replace function public.format_from_tipo(p_tipo text)
returns public.deliverable_format
language sql
immutable
set search_path = ''
as $$
  select case
    when lower(extensions.unaccent(p_tipo)) like 'reel%' then 'reels'
    when lower(extensions.unaccent(p_tipo)) like 'carross%' then 'carrossel'
    when lower(extensions.unaccent(p_tipo)) like 'stor%' then 'story'
    when lower(extensions.unaccent(p_tipo)) like 'relat%' then 'relatorio'
    else 'post'
  end::public.deliverable_format;
$$;

revoke execute on function public.format_from_tipo(text) from public, anon, authenticated;

-- ============================================================
-- generate_month: slots de entrega + cobranças
-- ============================================================

drop function public.generate_month(uuid, date);

-- Idempotente: rodar de novo não duplica slots nem cobranças.
-- Cadência diária vira uma entrega por semana ("Stories da semana").
create function public.generate_month(p_workspace_id uuid, p_competencia date)
returns table (entregas_criadas integer, cobrancas_criadas integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  comp date := date_trunc('month', p_competencia)::date;
  fim date := (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date;
  n_entregas integer := 0;
  n_cobrancas integer := 0;
begin
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
      d.data,
      row_number() over (partition by it.client_id, it.ord order by d.data) as seq,
      count(*) over (partition by it.client_id, it.ord) as total
    from itens it
    cross join lateral public.package_item_dates(
      comp,
      case when it.cadencia = 'diaria' then 'semanal'::public.package_cadence else it.cadencia end,
      case when it.cadencia = 'diaria' then least(it.quantidade, 1) else it.quantidade end
    ) as d(data)
  ),
  inseridas as (
    insert into public.deliverables (
      workspace_id, client_id, titulo, slot_label, formato, data_publicacao, status, ordem, competencia, slot_key
    )
    select
      workspace_id,
      client_id,
      null,
      case when cadencia = 'diaria'
        then format('%s da semana %s de %s', tipo, seq, total)
        else format('%s %s de %s', tipo, seq, total)
      end,
      public.format_from_tipo(tipo),
      data,
      'planejar',
      (data - date '2000-01-01') + ord / 100.0 + seq / 10000.0,
      comp,
      format('%s:%s', ord, seq)
    from datas
    on conflict (client_id, competencia, slot_key) where slot_key is not null do nothing
    returning 1
  )
  select count(*) into n_entregas from inseridas;

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

  update public.payments
  set status = 'atrasado'
  where workspace_id = p_workspace_id
    and status = 'pendente'
    and vencimento < (now() at time zone 'America/Sao_Paulo')::date;

  return query select n_entregas, n_cobrancas;
end;
$$;

revoke execute on function public.generate_month(uuid, date) from public, anon;
grant execute on function public.generate_month(uuid, date) to authenticated;

-- Tarefas-checkbox antigas do pacote: pendentes saem; concluídas ficam como histórico.
delete from public.tasks where origem = 'template' and status = 'pendente';

-- ============================================================
-- Linha do tempo: rótulo do slot quando não há título
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
       'entrega_criada', 'Entrega criada: ' || coalesce(d.titulo, d.slot_label), d.id
from public.deliverables d
where d.slot_key is null

union all
select d.workspace_id, d.client_id, d.status_changed_at,
       'entrega_' || d.status::text,
       case d.status
         when 'em_aprovacao' then 'Enviada para aprovação: '
         when 'aprovado' then 'Entrega aprovada: '
         else 'Entrega publicada: '
       end || coalesce(d.titulo, d.slot_label),
       d.id
from public.deliverables d
where d.status in ('em_aprovacao', 'aprovado', 'publicado')

union all
select a.workspace_id, d.client_id, a.created_at,
       'aprovacao_' || a.decisao::text,
       case a.decisao when 'aprovado' then 'Cliente aprovou: ' else 'Cliente pediu ajuste: ' end
         || coalesce(d.titulo, d.slot_label) || ' (' || a.autor_nome || ')'
         || coalesce(': "' || a.comentario || '"', ''),
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
where s.resolvido_em is not null;
