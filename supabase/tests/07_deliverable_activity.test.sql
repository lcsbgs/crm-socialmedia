-- Comentários e histórico de entregas: isolamento e registro automático.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

create function pg_temp.create_user(p_id uuid, p_email text, p_nome text)
returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
          p_email, jsonb_build_object('nome', p_nome), now(), now());
$$;

create function pg_temp.login(p_id uuid, p_email text)
returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims',
           json_build_object('sub', p_id, 'email', p_email, 'role', 'authenticated')::text, true);
$$;

select pg_temp.create_user('11111111-1111-4111-a111-111111111111', 'ana@teste.com', 'Ana');
select pg_temp.create_user('22222222-2222-4222-a222-222222222222', 'bia@teste.com', 'Bia');

create temp table ids as
select (select id from workspaces where owner_id = '11111111-1111-4111-a111-111111111111') as ws_ana;
grant select on ids to authenticated;

insert into clients (id, workspace_id, nome)
values ('cccccccc-0000-4000-a000-000000000001', (select ws_ana from ids), 'Padaria');

select pg_temp.login('11111111-1111-4111-a111-111111111111', 'ana@teste.com');
insert into deliverables (id, workspace_id, client_id, titulo)
values ('dddddddd-0000-4000-a000-000000000001', (select ws_ana from ids), 'cccccccc-0000-4000-a000-000000000001', 'Post');
update deliverables set status = 'produzir', data_publicacao = '2026-11-03', responsavel_id = '11111111-1111-4111-a111-111111111111'
where id = 'dddddddd-0000-4000-a000-000000000001';

select results_eq(
  $$ select tipo from deliverable_activity where deliverable_id = 'dddddddd-0000-4000-a000-000000000001' order by tipo $$,
  $$ values ('criada'), ('data'), ('responsavel'), ('status') $$,
  'histórico registra criação, etapa, data e responsável');
select is((select actor_id from deliverable_activity where tipo = 'status'), '11111111-1111-4111-a111-111111111111'::uuid,
  'histórico guarda quem fez');
select throws_ok(
  $$ insert into deliverable_activity (workspace_id, deliverable_id, tipo) values ((select ws_ana from ids), 'dddddddd-0000-4000-a000-000000000001', 'status') $$,
  '42501', null, 'histórico não aceita escrita direta');

select lives_ok(
  $$ insert into deliverable_comments (workspace_id, deliverable_id, author_id, corpo)
     values ((select ws_ana from ids), 'dddddddd-0000-4000-a000-000000000001', '11111111-1111-4111-a111-111111111111', 'Trocar a foto') $$,
  'membro comenta');
select throws_ok(
  $$ insert into deliverable_comments (workspace_id, deliverable_id, author_id, corpo)
     values ((select ws_ana from ids), 'dddddddd-0000-4000-a000-000000000001', '22222222-2222-4222-a222-222222222222', 'Fingindo ser a Bia') $$,
  '42501', null, 'não comenta em nome de outra pessoa');
select throws_ok(
  $$ update deliverables set responsavel_id = '22222222-2222-4222-a222-222222222222' where id = 'dddddddd-0000-4000-a000-000000000001' $$,
  '23514', null, 'responsável precisa ser membro');

reset role; select pg_temp.login('22222222-2222-4222-a222-222222222222', 'bia@teste.com');
select is((select count(*)::int from deliverable_comments), 0, 'Bia não vê comentários da Ana');
select is((select count(*)::int from deliverable_activity), 0, 'Bia não vê histórico da Ana');
select throws_ok(
  $$ insert into deliverable_comments (workspace_id, deliverable_id, author_id, corpo)
     values ((select ws_ana from ids), 'dddddddd-0000-4000-a000-000000000001', '22222222-2222-4222-a222-222222222222', 'Oi') $$,
  '42501', null, 'Bia não comenta no workspace da Ana');

select * from finish();
rollback;
