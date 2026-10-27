-- Notificações: criadas quando o cliente responde; cada um só vê e altera as suas.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

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
select pg_temp.create_user('33333333-3333-4333-a333-333333333333', 'caio@teste.com', 'Caio');

create temp table ids as
select (select id from workspaces where owner_id = '11111111-1111-4111-a111-111111111111') as ws;
grant select on ids to authenticated;

-- Bia é membro da Ana (plano pro); Caio não.
update workspaces set plano = 'pro' where id = (select ws from ids);
insert into workspace_members (workspace_id, user_id, role) values ((select ws from ids), '22222222-2222-4222-a222-222222222222', 'member');

insert into clients (id, workspace_id, nome, portal_token)
values ('cccccccc-0000-4000-a000-000000000001', (select ws from ids), 'Padaria', 'eeeeeeee-0000-4000-a000-000000000001');
insert into deliverables (id, workspace_id, client_id, titulo, status)
values ('dddddddd-0000-4000-a000-000000000001', (select ws from ids), 'cccccccc-0000-4000-a000-000000000001', 'Post A', 'em_aprovacao');

set local role service_role;
select portal_respond('eeeeeeee-0000-4000-a000-000000000001', 'dddddddd-0000-4000-a000-000000000001', 'ajuste', 'Trocar a foto', 'Marcos');
reset role;

select is((select count(*)::int from notifications where workspace_id = (select ws from ids)), 2, 'uma notificação por membro');
select is((select titulo from notifications where workspace_id = (select ws from ids) limit 1), 'Marcos pediu ajuste em "Post A"', 'título descreve a resposta');

select pg_temp.login('11111111-1111-4111-a111-111111111111', 'ana@teste.com');
select is((select count(*)::int from notifications), 1, 'Ana vê só a dela');
update notifications set lida_em = now();
select isnt((select lida_em from notifications), null, 'Ana marca como lida');
select throws_ok($$ update notifications set titulo = 'x' $$, '42501', null, 'não altera o conteúdo');

reset role; select pg_temp.login('33333333-3333-4333-a333-333333333333', 'caio@teste.com');
select is((select count(*)::int from notifications), 0, 'quem não é membro não vê nada');

reset role; select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from notifications where user_id = '22222222-2222-4222-a222-222222222222' and lida_em is null), 1,
  'a leitura da Ana não afeta a da Bia');

select throws_ok(
  $$ update workspaces set logo_path = 'outro/marca/x.png' where id = (select ws from ids) $$,
  '23514', null, 'logo precisa ficar na pasta de marca do workspace');

select * from finish();
rollback;
