-- Reuniões: isolamento e vínculo com tarefas.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

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
select
  (select id from workspaces where owner_id = '11111111-1111-4111-a111-111111111111') as ws_ana,
  (select id from workspaces where owner_id = '22222222-2222-4222-a222-222222222222') as ws_bia;
grant select on ids to authenticated;

insert into clients (id, workspace_id, nome)
values ('cccccccc-0000-4000-a000-000000000001', (select ws_ana from ids), 'Padaria');
insert into meetings (id, workspace_id, client_id, titulo, notas_brutas)
values ('ffffffff-0000-4000-a000-000000000001', (select ws_ana from ids),
        'cccccccc-0000-4000-a000-000000000001', 'Kickoff', 'notas');
insert into tasks (workspace_id, client_id, titulo, origem, meeting_id)
values ((select ws_ana from ids), 'cccccccc-0000-4000-a000-000000000001', 'Enviar proposta', 'ata',
        'ffffffff-0000-4000-a000-000000000001');

select pg_temp.login('22222222-2222-4222-a222-222222222222', 'bia@teste.com');
select is((select count(*)::int from meetings), 0, 'Bia não vê reuniões da Ana');
select throws_ok(
  $$ insert into meetings (workspace_id, client_id, titulo)
     values ((select ws_ana from ids), 'cccccccc-0000-4000-a000-000000000001', 'Invasão') $$,
  '42501', null, 'Bia não cria reunião no workspace da Ana');
update meetings set notas_brutas = 'hackeado';
reset role; select set_config('request.jwt.claims', '', true);
select is((select notas_brutas from meetings), 'notas', 'Bia não altera reunião da Ana');

select throws_ok(
  $$ insert into tasks (workspace_id, titulo, meeting_id)
     values ((select ws_bia from ids), 'X', 'ffffffff-0000-4000-a000-000000000001') $$,
  '23503', null, 'tarefa não aponta para reunião de outro workspace');

select ok(exists(select 1 from client_timeline where tipo = 'reuniao'), 'reunião na linha do tempo');

delete from meetings where id = 'ffffffff-0000-4000-a000-000000000001';
select is((select meeting_id from tasks where titulo = 'Enviar proposta'), null,
  'excluir reunião mantém a tarefa e limpa o vínculo');

select * from finish();
rollback;
