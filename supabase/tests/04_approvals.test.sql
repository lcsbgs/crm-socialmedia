-- Portal do cliente: anon sem acesso, resposta só via service role e com token válido.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-a111-111111111111',
        'authenticated', 'authenticated', 'ana@teste.com', '{"nome":"Ana"}', now(), now());

create temp table ids as
select (select id from workspaces where owner_id = '11111111-1111-4111-a111-111111111111') as ws;
grant select on ids to authenticated, anon, service_role;

insert into clients (id, workspace_id, nome, portal_token)
values ('cccccccc-0000-4000-a000-000000000001', (select ws from ids), 'Padaria',
        'eeeeeeee-0000-4000-a000-000000000001');
insert into deliverables (id, workspace_id, client_id, titulo, status) values
  ('dddddddd-0000-4000-a000-000000000001', (select ws from ids), 'cccccccc-0000-4000-a000-000000000001', 'Post A', 'em_aprovacao'),
  ('dddddddd-0000-4000-a000-000000000002', (select ws from ids), 'cccccccc-0000-4000-a000-000000000001', 'Post B', 'em_aprovacao'),
  ('dddddddd-0000-4000-a000-000000000003', (select ws from ids), 'cccccccc-0000-4000-a000-000000000001', 'Post C', 'planejar');

-- anon não lê nada nem chama a função do portal
set local role anon;
select throws_ok($$ select * from clients $$, '42501', null, 'anon não lê clientes');
select throws_ok($$ select * from deliverables $$, '42501', null, 'anon não lê entregas');
select throws_ok($$ select * from approvals $$, '42501', null, 'anon não lê aprovações');
select throws_ok(
  $$ select portal_respond('eeeeeeee-0000-4000-a000-000000000001', 'dddddddd-0000-4000-a000-000000000001', 'aprovado', null, 'Marcos') $$,
  '42501', null, 'anon não chama portal_respond');
reset role;

-- authenticated também não chama portal_respond
select ok(not has_function_privilege('authenticated',
  'public.portal_respond(uuid, uuid, public.approval_decision, text, text, text, text, jsonb)', 'execute'),
  'authenticated não executa portal_respond');

-- service role (servidor do portal)
set local role service_role;
select lives_ok(
  $$ select portal_respond('eeeeeeee-0000-4000-a000-000000000001', 'dddddddd-0000-4000-a000-000000000001', 'aprovado', '', 'Marcos') $$,
  'cliente aprova com token válido');
select throws_ok(
  $$ select portal_respond('eeeeeeee-0000-4000-a000-000000000001', 'dddddddd-0000-4000-a000-000000000002', 'ajuste', '  ', 'Marcos') $$,
  '22023', null, 'ajuste exige comentário');
select lives_ok(
  $$ select portal_respond('eeeeeeee-0000-4000-a000-000000000001', 'dddddddd-0000-4000-a000-000000000002', 'ajuste', 'Trocar a foto', 'Marcos') $$,
  'cliente pede ajuste');
select throws_ok(
  $$ select portal_respond('eeeeeeee-0000-4000-a000-000000000001', 'dddddddd-0000-4000-a000-000000000001', 'aprovado', null, 'Marcos') $$,
  '22023', null, 'não responde duas vezes');
select throws_ok(
  $$ select portal_respond('eeeeeeee-0000-4000-a000-000000000001', 'dddddddd-0000-4000-a000-000000000003', 'aprovado', null, 'Marcos') $$,
  '22023', null, 'não aprova entrega fora de aprovação');
select throws_ok(
  $$ select portal_respond('eeeeeeee-0000-4000-a000-000000000009', 'dddddddd-0000-4000-a000-000000000003', 'aprovado', null, 'X') $$,
  'P0002', null, 'token inválido não encontra entrega');
reset role;

select results_eq(
  $$ select status::text from deliverables where id in ('dddddddd-0000-4000-a000-000000000001', 'dddddddd-0000-4000-a000-000000000002') order by titulo $$,
  $$ values ('aprovado'), ('ajuste') $$,
  'aprovação move para aprovado e ajuste vai para Ajuste pedido');
select is((select count(*)::int from client_timeline where tipo like 'aprovacao_%' and workspace_id = (select ws from ids)), 2, 'respostas na linha do tempo');

select * from finish();
rollback;
