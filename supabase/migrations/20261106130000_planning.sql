-- Pauta, Fase 5: pacotes e planejamento.
-- Preço e limite de rodadas no pacote, geração automática do mês (pg_cron),
-- capacidade do pacote por mês e escopo extra ligado ao post.

alter table public.package_templates
  add column if not exists preco numeric(12, 2) check (preco is null or preco >= 0),
  add column if not exists limite_rodadas integer not null default 2 check (limite_rodadas between 0 and 10);

alter table public.scope_requests
  add column if not exists deliverable_id uuid references public.deliverables (id) on delete set null,
  add column if not exists origem text not null default 'manual' check (origem in ('manual', 'limite_pacote', 'rodadas'));

-- Quantos posts o pacote prevê no mês e quantos já existem (todos os formatos).
create or replace function public.package_month_status(p_client_id uuid, p_month date)
returns table (capacidade integer, usados integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  comp date := date_trunc('month', p_month)::date;
  fim date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  itens jsonb;
  cap integer := 0;
  item jsonb;
  cad public.package_cadence;
  qtd integer;
begin
  if not public.can_access_client(p_client_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  select p.itens into itens
  from public.clients c
  join public.package_templates p on p.id = c.package_template_id
  where c.id = p_client_id;

  if itens is not null then
    for item in select * from jsonb_array_elements(itens) loop
      cad := coalesce((item ->> 'cadencia')::public.package_cadence, 'mensal');
      qtd := greatest(coalesce((item ->> 'quantidade')::integer, 0), 0);
      if cad = 'diaria' then
        cad := 'semanal';
        qtd := least(qtd, 1);
      end if;
      cap := cap + (select count(*) from public.package_item_dates(comp, cad, qtd))::integer;
    end loop;
  end if;

  return query
  select cap,
         (select count(*)::integer from public.deliverables d
          where d.client_id = p_client_id
            and (d.competencia = comp or (d.competencia is null and d.data_publicacao between comp and fim)));
end;
$$;
revoke execute on function public.package_month_status(uuid, date) from public, anon;
grant execute on function public.package_month_status(uuid, date) to authenticated;

-- Geração do mês para todos os espaços (agendada). Só service_role.
create or replace function public.generate_month_all(p_competencia date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  comp date := coalesce(p_competencia, (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month')::date);
  n integer := 0;
begin
  for ws in select id from public.workspaces loop
    perform public.generate_month(ws, comp);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.generate_month_all(date) from public, anon, authenticated;
grant execute on function public.generate_month_all(date) to service_role;

-- Agenda no pg_cron quando a extensão existe (Supabase): dia 20, 06:00 UTC, monta o mês seguinte.
-- Rodar de novo não duplica nada (generate_month é idempotente).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'pauta-gerar-mes';
    perform cron.schedule('pauta-gerar-mes', '0 6 20 * *', 'select public.generate_month_all()');
  end if;
exception when others then
  raise notice 'pg_cron indisponível: agende generate_month_all() manualmente (%).', sqlerrm;
end;
$$;
