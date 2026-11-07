begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(2);
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'dona@teste.com', '{"nome":"Dona"}', now(), now());
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-a111-111111111111"}', true);
insert into clients (id, workspace_id, nome) values ('c1000000-0000-4000-a000-000000000001', (select id from workspaces limit 1), 'Padaria');
select set_config('request.jwt.claims', '', true);
insert into client_assignees (workspace_id, client_id, user_id)
select workspace_id, id, 'a1111111-1111-4111-a111-111111111111' from clients on conflict do nothing;
insert into meetings (workspace_id, client_id, titulo, data) values
  ((select id from workspaces limit 1), 'c1000000-0000-4000-a000-000000000001', 'Alinhamento', now() + interval '10 minutes'),
  ((select id from workspaces limit 1), 'c1000000-0000-4000-a000-000000000001', 'Depois', now() + interval '2 hours');
select is(run_meeting_briefs(), 1, 'avisa só a reunião dos próximos 15 minutos');
select is(run_meeting_briefs(), 0, 'não avisa duas vezes');
select * from finish();
rollback;
