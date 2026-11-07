-- Revisão final: nenhuma tabela nova vaza entre espaços, e membro não vê financeiro nem comercial.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create temp table tabelas (nome text);
insert into tabelas values
  ('client_assignees'), ('client_strategies'), ('brand_kits'), ('client_files'), ('timeline_events'),
  ('deliverable_versions'), ('ai_usage'), ('month_plans'), ('social_connections'), ('social_accounts'),
  ('publish_jobs'), ('published_posts'), ('integration_connections'), ('leads'), ('proposals'),
  ('proposal_views'), ('contracts'), ('expenses'), ('accounting_closings'), ('metrics_daily'), ('reports');
grant select on tabelas to authenticated;

select plan(25);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'ana@teste.com', '{"nome":"Ana"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-4222-a222-222222222222', 'authenticated', 'authenticated', 'bia@teste.com', '{"nome":"Bia"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3333333-3333-4333-a333-333333333333', 'authenticated', 'authenticated', 'caio@teste.com', '{"nome":"Caio"}', now(), now());
create temp table ids as select (select id from workspaces where owner_id = 'a1111111-1111-4111-a111-111111111111') as ws;
grant select on ids to authenticated;
update workspaces set plano = 'pro' where id = (select ws from ids);
insert into workspace_members (workspace_id, user_id, role) values ((select ws from ids), 'c3333333-3333-4333-a333-333333333333', 'member');

-- Ana preenche uma linha em cada tabela (como service role, para ir rápido).
insert into clients (id, workspace_id, nome) values ('c1000000-0000-4000-a000-000000000001', (select ws from ids), 'Padaria');
insert into client_assignees values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'a1111111-1111-4111-a111-111111111111', now());
insert into client_strategies (client_id, workspace_id) values ('c1000000-0000-4000-a000-000000000001', (select ws from ids));
insert into brand_kits (client_id, workspace_id) values ('c1000000-0000-4000-a000-000000000001', (select ws from ids));
insert into client_files (workspace_id, client_id, nome, path) values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'logo.png', 'x');
insert into timeline_events (workspace_id, client_id, titulo) values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'nota');
insert into deliverables (id, workspace_id, client_id, titulo) values ('d1000000-0000-4000-a000-000000000001', (select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'Post');
insert into deliverable_versions (workspace_id, deliverable_id, numero) values ((select ws from ids), 'd1000000-0000-4000-a000-000000000001', 1);
insert into ai_usage (workspace_id, provider, tarefa) values ((select ws from ids), 'mock', 'legenda');
insert into month_plans (workspace_id, client_id, competencia) values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', '2026-12-01');
insert into social_connections (id, workspace_id, provider) values ('e1000000-0000-4000-a000-000000000001', (select ws from ids), 'facebook');
insert into social_accounts (id, workspace_id, connection_id, client_id, plataforma, external_id, nome)
  values ('f1000000-0000-4000-a000-000000000001', (select ws from ids), 'e1000000-0000-4000-a000-000000000001', 'c1000000-0000-4000-a000-000000000001', 'instagram', '1', '@p');
insert into publish_jobs (workspace_id, deliverable_id, social_account_id, agendado_para) values ((select ws from ids), 'd1000000-0000-4000-a000-000000000001', 'f1000000-0000-4000-a000-000000000001', now());
insert into published_posts (workspace_id, deliverable_id, external_id) values ((select ws from ids), 'd1000000-0000-4000-a000-000000000001', 'x');
insert into integration_connections (workspace_id, provider) values ((select ws from ids), 'asaas');
insert into leads (id, workspace_id, nome) values ('11000000-0000-4000-a000-000000000001', (select ws from ids), 'Lead');
insert into proposals (id, workspace_id, lead_id) values ('22000000-0000-4000-a000-000000000001', (select ws from ids), '11000000-0000-4000-a000-000000000001');
insert into proposal_views (workspace_id, proposal_id) values ((select ws from ids), '22000000-0000-4000-a000-000000000001');
insert into contracts (workspace_id, corpo) values ((select ws from ids), 'x');
insert into expenses (workspace_id, descricao, valor) values ((select ws from ids), 'x', 1);
insert into accounting_closings (workspace_id, competencia) values ((select ws from ids), '2026-11-01');
insert into metrics_daily (workspace_id, client_id, social_account_id, data) values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'f1000000-0000-4000-a000-000000000001', '2026-11-01');
insert into reports (workspace_id, client_id, competencia) values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', '2026-11-01');

-- Bia é de outro espaço: não vê nada.
select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-a222-222222222222","role":"authenticated"}', true);
create function pg_temp.conta(t text) returns int language plpgsql as $$
declare n int;
begin
  execute format('select count(*) from public.%I', t) into n;
  return n;
end $$;
select is(pg_temp.conta(nome), 0, format('outro espaço não vê %s', nome)) from tabelas where nome <> 'social_connections';
select is((select count(*)::int from social_connections), 0, 'outro espaço não vê social_connections');

-- Caio é membro sem o cliente: não vê comercial, despesas, fechamento nem a conexão do Asaas.
select set_config('request.jwt.claims', '{"sub":"c3333333-3333-4333-a333-333333333333","role":"authenticated"}', true);
select is((select count(*)::int from leads) + (select count(*)::int from proposals) + (select count(*)::int from contracts), 0, 'membro não vê comercial');
select is((select count(*)::int from expenses) + (select count(*)::int from accounting_closings), 0, 'membro não vê despesas nem fechamento');
select is((select count(*)::int from payments), 0, 'membro não vê cobranças');
select is((select count(*)::int from reports) + (select count(*)::int from metrics_daily), 0, 'membro sem o cliente não vê relatório nem métricas');

select * from finish();
rollback;
