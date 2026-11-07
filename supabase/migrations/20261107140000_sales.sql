-- Pauta, Fase 10: comercial. Funil de leads, propostas com página pública, visualizações,
-- aceite, contratos com assinatura simples ou por provedor, e conversão em cliente.
-- Comercial é só para owner e admin.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 120),
  contato_nome text,
  email text,
  telefone text,
  segmento text,
  origem text,
  etapa text not null default 'novo' check (etapa in ('novo', 'conversa', 'proposta', 'negociacao', 'ganho', 'perdido')),
  valor_estimado numeric(12, 2),
  ordem double precision not null default 0,
  notas text,
  client_id uuid references public.clients (id) on delete set null,
  perdido_motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_ws_idx on public.leads (workspace_id, etapa, ordem);
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  titulo text not null default 'Proposta',
  package_template_id uuid references public.package_templates (id) on delete set null,
  itens jsonb not null default '[]'::jsonb,
  valor_mensal numeric(12, 2) not null default 0 check (valor_mensal >= 0),
  duracao_meses integer not null default 6 check (duracao_meses between 1 and 36),
  dia_vencimento integer not null default 10 check (dia_vencimento between 1 and 28),
  validade date,
  diagnostico text,
  observacoes text,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'aceita', 'recusada')),
  token uuid not null default gen_random_uuid() unique,
  enviada_em timestamptz,
  aceita_em timestamptz,
  aceite_nome text,
  aceite_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index proposals_lead_idx on public.proposals (lead_id);
create trigger proposals_updated_at before update on public.proposals for each row execute function public.set_updated_at();

create table public.proposal_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  ip text,
  user_agent text,
  viewed_at timestamptz not null default now()
);
create index proposal_views_idx on public.proposal_views (proposal_id, viewed_at desc);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  proposal_id uuid references public.proposals (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  titulo text not null default 'Contrato de prestação de serviços',
  corpo text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'assinado', 'cancelado')),
  token uuid not null default gen_random_uuid() unique,
  provider text not null default 'simples' check (provider in ('simples', 'clicksign', 'zapsign')),
  provider_doc_id text,
  provider_sign_url text,
  enviado_em timestamptz,
  assinado_em timestamptz,
  assinante_nome text,
  assinante_ip text,
  inicio date,
  fim date,
  renovacao_avisada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contracts_ws_idx on public.contracts (workspace_id, status, fim);
create trigger contracts_updated_at before update on public.contracts for each row execute function public.set_updated_at();

alter table public.workspaces add column if not exists contrato_modelo text;

-- ============================================================
-- RLS: só owner e admin
-- ============================================================
alter table public.leads enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_views enable row level security;
alter table public.contracts enable row level security;

create policy "leads: owner e admin" on public.leads for all to authenticated
  using ((select public.is_workspace_admin(workspace_id))) with check ((select public.is_workspace_admin(workspace_id)));
create policy "proposals: owner e admin" on public.proposals for all to authenticated
  using ((select public.is_workspace_admin(workspace_id))) with check ((select public.is_workspace_admin(workspace_id)));
create policy "proposal_views: owner e admin leem" on public.proposal_views for select to authenticated
  using ((select public.is_workspace_admin(workspace_id)));
create policy "contracts: owner e admin" on public.contracts for all to authenticated
  using ((select public.is_workspace_admin(workspace_id))) with check ((select public.is_workspace_admin(workspace_id)));

revoke all on public.leads, public.proposals, public.proposal_views, public.contracts from anon, authenticated;
grant select, insert, update, delete on public.leads, public.proposals, public.contracts to authenticated;
grant select on public.proposal_views to authenticated;

-- ============================================================
-- Funções públicas (só service role, pelo servidor)
-- ============================================================
create or replace function public.register_proposal_view(p_token uuid, p_ip text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals;
  lead_nome text;
begin
  select * into p from public.proposals where token = p_token and status in ('enviada', 'aceita');
  if p.id is null then
    return;
  end if;
  insert into public.proposal_views (workspace_id, proposal_id, ip, user_agent)
  values (p.workspace_id, p.id, left(p_ip, 64), left(p_user_agent, 300));
  -- Avisa só na primeira abertura do dia.
  if (select count(*) from public.proposal_views v
      where v.proposal_id = p.id and v.viewed_at >= date_trunc('day', now())) = 1 then
    select nome into lead_nome from public.leads where id = p.lead_id;
    insert into public.notifications (workspace_id, user_id, tipo, titulo, corpo)
    select p.workspace_id, m.user_id, 'proposta', format('%s abriu a proposta', lead_nome), p.titulo
    from public.workspace_members m where m.workspace_id = p.workspace_id and m.role in ('owner', 'admin');
  end if;
end;
$$;

create or replace function public.accept_proposal(p_token uuid, p_nome text, p_ip text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals;
begin
  select * into p from public.proposals where token = p_token for update;
  if p.id is null then
    raise exception 'Proposta não encontrada' using errcode = 'P0002';
  end if;
  if p.status <> 'enviada' then
    raise exception 'Esta proposta não está aberta para aceite' using errcode = '22023';
  end if;
  if p.validade is not null and p.validade < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Esta proposta venceu. Peça uma nova.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_nome, ''))) = 0 then
    raise exception 'Informe seu nome' using errcode = '22023';
  end if;
  update public.proposals set status = 'aceita', aceita_em = now(), aceite_nome = trim(p_nome), aceite_ip = left(p_ip, 64)
  where id = p.id;
  update public.leads set etapa = 'negociacao' where id = p.lead_id and etapa in ('novo', 'conversa', 'proposta');
  insert into public.notifications (workspace_id, user_id, tipo, titulo, corpo)
  select p.workspace_id, m.user_id, 'proposta', format('%s aceitou a proposta', trim(p_nome)), 'Gere o contrato para assinatura.'
  from public.workspace_members m where m.workspace_id = p.workspace_id and m.role in ('owner', 'admin');
  return p.id;
end;
$$;

-- Assinatura (simples no portal ou confirmada pelo provedor) e conversão em cliente.
create or replace function public.sign_contract(p_token uuid, p_nome text, p_ip text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contracts;
  l public.leads;
  p public.proposals;
  novo uuid;
  dono uuid;
begin
  select * into c from public.contracts where token = p_token for update;
  if c.id is null then
    raise exception 'Contrato não encontrado' using errcode = 'P0002';
  end if;
  if c.status = 'assinado' then
    return c.client_id;
  end if;
  if c.status <> 'enviado' then
    raise exception 'Este contrato não está aberto para assinatura' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_nome, ''))) = 0 then
    raise exception 'Informe seu nome' using errcode = '22023';
  end if;

  select * into l from public.leads where id = c.lead_id;
  select * into p from public.proposals where id = c.proposal_id;

  novo := l.client_id;
  if novo is null then
    insert into public.clients (workspace_id, nome, segmento, package_template_id, valor_mensal, dia_vencimento, inicio_contrato, contatos)
    values (
      c.workspace_id, l.nome, l.segmento, p.package_template_id, p.valor_mensal, p.dia_vencimento,
      coalesce(c.inicio, (now() at time zone 'America/Sao_Paulo')::date),
      case when l.contato_nome is not null or l.telefone is not null or l.email is not null
        then jsonb_build_array(jsonb_build_object('nome', coalesce(l.contato_nome, l.nome), 'cargo', 'aprova conteúdo',
                                                  'telefone', coalesce(l.telefone, ''), 'email', coalesce(l.email, '')))
        else '[]'::jsonb end
    )
    returning id into novo;
    -- Quem cuida: owner do espaço.
    select owner_id into dono from public.workspaces where id = c.workspace_id;
    insert into public.client_assignees (workspace_id, client_id, user_id) values (c.workspace_id, novo, dono) on conflict do nothing;
  end if;

  update public.contracts
  set status = 'assinado', assinado_em = now(), assinante_nome = trim(p_nome), assinante_ip = left(p_ip, 64), client_id = novo
  where id = c.id;
  update public.leads set etapa = 'ganho', client_id = novo where id = l.id;
  update public.clients
  set onboarding_checklist = '[{"key":"contrato","label":"Contrato assinado","done":true}]'::jsonb
  where id = novo;

  insert into public.timeline_events (workspace_id, client_id, tipo, titulo)
  values (c.workspace_id, novo, 'contrato', format('Contrato assinado por %s', trim(p_nome)));
  insert into public.notifications (workspace_id, user_id, tipo, titulo, corpo)
  select c.workspace_id, m.user_id, 'proposta', format('%s assinou o contrato', l.nome), 'Virou cliente. O onboarding já começou.'
  from public.workspace_members m where m.workspace_id = c.workspace_id and m.role in ('owner', 'admin');

  -- Cobrança e posts do primeiro mês.
  perform public.generate_month(c.workspace_id, coalesce(c.inicio, (now() at time zone 'America/Sao_Paulo')::date));
  return novo;
end;
$$;

-- Renovações: avisa 30 dias antes do fim do contrato.
create or replace function public.run_contract_renewals()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  with alvo as (
    update public.contracts c
    set renovacao_avisada_em = now()
    where c.status = 'assinado' and c.fim is not null
      and c.fim between (now() at time zone 'America/Sao_Paulo')::date and (now() at time zone 'America/Sao_Paulo')::date + 30
      and c.renovacao_avisada_em is null
    returning c.id, c.workspace_id, c.client_id, c.fim
  ),
  avisos as (
    insert into public.notifications (workspace_id, user_id, tipo, titulo, corpo)
    select a.workspace_id, m.user_id, 'proposta',
           format('Contrato de %s vence em %s', cl.nome, to_char(a.fim, 'DD/MM')),
           'Hora de conversar sobre a renovação.'
    from alvo a
    join public.clients cl on cl.id = a.client_id
    join public.workspace_members m on m.workspace_id = a.workspace_id and m.role in ('owner', 'admin')
    returning 1
  )
  select count(*) into n from alvo;
  return n;
end;
$$;

revoke execute on function public.register_proposal_view(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.accept_proposal(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.sign_contract(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.run_contract_renewals() from public, anon, authenticated;
grant execute on function public.register_proposal_view(uuid, text, text) to service_role;
grant execute on function public.accept_proposal(uuid, text, text) to service_role;
grant execute on function public.sign_contract(uuid, text, text) to service_role;
grant execute on function public.run_contract_renewals() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'pauta-renovacoes';
    perform cron.schedule('pauta-renovacoes', '41 11 * * *', 'select public.run_contract_renewals()');
  end if;
exception when others then
  raise notice 'pg_cron indisponível: agende run_contract_renewals() manualmente (%).', sqlerrm;
end;
$$;
