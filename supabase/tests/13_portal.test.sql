-- Portal: ajuste com ponto e IP, rodadas viram escopo, aprovar todos, planejamento, lembrete e tácita.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'dona@teste.com', '{"nome":"Dona"}', now(), now());
create temp table ids as select (select id from workspaces where owner_id = 'a1111111-1111-4111-a111-111111111111') as ws;

insert into package_templates (id, workspace_id, nome, itens, limite_rodadas)
values ('b0000000-0000-4000-a000-000000000001', (select ws from ids), 'Essencial', '[]', 1);
insert into clients (id, workspace_id, nome, package_template_id)
values ('c1000000-0000-4000-a000-000000000001', (select ws from ids), 'Padaria', 'b0000000-0000-4000-a000-000000000001');
insert into deliverables (id, workspace_id, client_id, titulo, status) values
  ('d1000000-0000-4000-a000-000000000001', (select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'Pão', 'em_aprovacao'),
  ('d1000000-0000-4000-a000-000000000002', (select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'Bolo', 'em_aprovacao'),
  ('d1000000-0000-4000-a000-000000000003', (select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'Café', 'em_aprovacao');
create temp table tok as select portal_token as t from clients where id = 'c1000000-0000-4000-a000-000000000001';

select lives_ok($$ select portal_respond((select t from tok), 'd1000000-0000-4000-a000-000000000001', 'ajuste', 'Trocar a foto', 'Mariana', '200.1.2.3', 'Safari', '{"x": 40, "y": 60}') $$,
  'cliente pede ajuste com ponto na imagem');
select is((select status::text from deliverables where id = 'd1000000-0000-4000-a000-000000000001'), 'ajuste', 'post vai para Ajuste pedido');
select is((select ip from approvals where deliverable_id = 'd1000000-0000-4000-a000-000000000001'), '200.1.2.3', 'resposta guarda o IP');
select is((select (ponto->>'x')::int from approvals where deliverable_id = 'd1000000-0000-4000-a000-000000000001'), 40, 'resposta guarda o ponto');
select is((select count(*)::int from scope_requests where origem = 'rodadas'), 0, 'primeira rodada está dentro do limite');

update deliverables set status = 'em_aprovacao' where id = 'd1000000-0000-4000-a000-000000000001';
select portal_respond((select t from tok), 'd1000000-0000-4000-a000-000000000001', 'ajuste', 'Outra coisa', 'Mariana');
select is((select count(*)::int from scope_requests where origem = 'rodadas'), 1, 'rodada além do limite sugere escopo extra');

select is(portal_approve_all((select t from tok), 'Mariana'), 2, 'aprovar todos aprova os que esperam');
select is((select count(*)::int from deliverables where status = 'aprovado'), 2, 'os dois ficam aprovados');

-- Planejamento do mês
insert into month_plans (workspace_id, client_id, competencia) values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', '2026-12-01');
select throws_ok($$ select portal_plan_respond((select t from tok), '2026-12-01', 'ajuste', '', 'Mariana') $$, '22023', null, 'ajuste no planejamento exige comentário');
select lives_ok($$ select portal_plan_respond((select t from tok), '2026-12-10', 'aprovado', '', 'Mariana', '1.1.1.1') $$, 'cliente aprova o planejamento');
select is((select status from month_plans), 'aprovado', 'planejamento fica aprovado');

-- Lembrete e tácita
insert into deliverables (id, workspace_id, client_id, titulo, status) values
  ('d1000000-0000-4000-a000-000000000004', (select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'Antigo', 'em_aprovacao');
update deliverables set status_changed_at = now() - interval '3 days' where id = 'd1000000-0000-4000-a000-000000000004';
select is((select lembretes from run_approval_reminders()), 1, 'lembrete depois de 48 horas');
update clients set aprovacao_tacita_horas = 48 where id = 'c1000000-0000-4000-a000-000000000001';
select is((select tacitas from run_approval_reminders()), 1, 'aprovação tácita quando o cliente optou');

select * from finish();
rollback;
