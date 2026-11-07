-- Pauta, Fase 11: financeiro.
-- Cobranças avulsas e de escopo, cobrança automática (manual ou Asaas), NFS-e, despesas,
-- rentabilidade e fechamento do mês para o contador. Tudo só para owner e admin.

alter table public.payments
  add column if not exists origem text not null default 'mensalidade' check (origem in ('mensalidade', 'avulsa', 'escopo')),
  add column if not exists descricao text,
  add column if not exists metodo text check (metodo is null or metodo in ('pix', 'boleto', 'manual', 'cartao')),
  add column if not exists provider text not null default 'manual' check (provider in ('manual', 'asaas')),
  add column if not exists provider_id text,
  add column if not exists boleto_url text,
  add column if not exists pix_code text,
  add column if not exists cobranca_gerada_em timestamptz,
  add column if not exists lembrete_enviado_em timestamptz,
  add column if not exists simulated boolean not null default false,
  add column if not exists nfse_status text not null default 'nao_emitida' check (nfse_status in ('nao_emitida', 'pendente', 'emitida', 'erro')),
  add column if not exists nfse_numero text,
  add column if not exists nfse_pdf_url text,
  add column if not exists nfse_xml_url text,
  add column if not exists nfse_erro text,
  add column if not exists nfse_provider_id text;

-- Uma mensalidade por cliente e mês; avulsas e escopo podem ser várias.
alter table public.payments drop constraint if exists payments_client_id_competencia_key;
create unique index if not exists payments_mensalidade_unique on public.payments (client_id, competencia) where origem = 'mensalidade';
create index if not exists payments_provider_idx on public.payments (provider, provider_id);

alter table public.workspaces
  add column if not exists finance_config jsonb not null default
    '{"provider":"manual","dias_antes":5,"auto_cobranca":false,"auto_whatsapp":false,"auto_baixa":true,"auto_nfse":false,"contador_email":null}'::jsonb;

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  descricao text not null check (char_length(trim(descricao)) between 1 and 200),
  categoria text not null default 'outros' check (categoria in ('freelancer', 'ferramentas', 'impostos', 'anuncios', 'equipe', 'outros')),
  valor numeric(12, 2) not null check (valor >= 0),
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  client_id uuid references public.clients (id) on delete set null,
  comprovante_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_ws_data_idx on public.expenses (workspace_id, data);
create trigger expenses_updated_at before update on public.expenses for each row execute function public.set_updated_at();

create table public.accounting_closings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  competencia date not null,
  enviado_em timestamptz not null default now(),
  enviado_para text,
  resumo jsonb not null default '{}'::jsonb,
  simulated boolean not null default false,
  unique (workspace_id, competencia)
);

alter table public.expenses enable row level security;
alter table public.accounting_closings enable row level security;
create policy "expenses: owner e admin" on public.expenses for all to authenticated
  using ((select public.is_workspace_admin(workspace_id))) with check ((select public.is_workspace_admin(workspace_id)));
create policy "accounting_closings: owner e admin" on public.accounting_closings for all to authenticated
  using ((select public.is_workspace_admin(workspace_id))) with check ((select public.is_workspace_admin(workspace_id)));
revoke all on public.expenses, public.accounting_closings from anon, authenticated;
grant select, insert, update, delete on public.expenses, public.accounting_closings to authenticated;

-- Baixa e NFS-e vindas do webhook do provedor (só service role).
create or replace function public.billing_mark_paid(p_provider_id text, p_pago_em date, p_metodo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pg public.payments;
begin
  update public.payments
  set status = 'pago', pago_em = coalesce(p_pago_em, (now() at time zone 'America/Sao_Paulo')::date), metodo = coalesce(p_metodo, metodo)
  where provider_id = p_provider_id and status <> 'pago'
  returning * into pg;
  if pg.id is not null then
    insert into public.notifications (workspace_id, user_id, tipo, titulo)
    select pg.workspace_id, m.user_id, 'pagamento',
           format('%s pagou %s', c.nome, to_char(pg.valor, 'FM"R$ "999G999G990D00'))
    from public.workspace_members m join public.clients c on c.id = pg.client_id
    where m.workspace_id = pg.workspace_id and m.role in ('owner', 'admin');
  end if;
  return pg.id;
end;
$$;

create or replace function public.billing_set_invoice(p_payment_provider_id text, p_status text, p_numero text, p_pdf text, p_xml text, p_erro text, p_invoice_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments
  set nfse_status = p_status, nfse_numero = coalesce(p_numero, nfse_numero), nfse_pdf_url = coalesce(p_pdf, nfse_pdf_url),
      nfse_xml_url = coalesce(p_xml, nfse_xml_url), nfse_erro = p_erro, nfse_provider_id = coalesce(p_invoice_id, nfse_provider_id)
  where provider_id = p_payment_provider_id or nfse_provider_id = p_invoice_id;
$$;

revoke execute on function public.billing_mark_paid(text, date, text) from public, anon, authenticated;
revoke execute on function public.billing_set_invoice(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.billing_mark_paid(text, date, text) to service_role;
grant execute on function public.billing_set_invoice(text, text, text, text, text, text, text) to service_role;

-- generate_month: a cobrança mensal agora usa o índice parcial de mensalidade.
create or replace function public.generate_month(p_workspace_id uuid, p_competencia date)
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
    on conflict (client_id, competencia) where origem = 'mensalidade' do nothing
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
