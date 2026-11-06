-- Equipe: membro só vê clientes atribuídos; financeiro só owner/admin; convite com clientes e lugar.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

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

select pg_temp.create_user('a1111111-1111-4111-a111-111111111111', 'dona@teste.com', 'Dona');
select pg_temp.create_user('b2222222-2222-4222-a222-222222222222', 'membro@teste.com', 'Membro');
select pg_temp.create_user('c3333333-3333-4333-a333-333333333333', 'extra@teste.com', 'Extra');

create temp table ids as
select (select id from workspaces where owner_id = 'a1111111-1111-4111-a111-111111111111') as ws;
grant select on ids to authenticated;
update workspaces set plano = 'pro' where id = (select ws from ids);

-- Dona cria dois clientes e uma cobrança
select pg_temp.login('a1111111-1111-4111-a111-111111111111', 'dona@teste.com');
insert into clients (id, workspace_id, nome) values
  ('c1000000-0000-4000-a000-000000000001', (select ws from ids), 'Padaria'),
  ('c1000000-0000-4000-a000-000000000002', (select ws from ids), 'Clínica');
insert into payments (workspace_id, client_id, competencia, valor, vencimento)
values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', '2026-11-01', 1200, '2026-11-10');
insert into deliverables (workspace_id, client_id, titulo) values
  ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'Post padaria'),
  ((select ws from ids), 'c1000000-0000-4000-a000-000000000002', 'Post clínica');

select is((select count(*)::int from client_assignees where user_id = 'a1111111-1111-4111-a111-111111111111'), 2,
  'quem cria o cliente fica atribuído a ele');

-- Convite com um cliente
insert into invitations (workspace_id, email, role, invited_by, client_ids)
values ((select ws from ids), 'membro@teste.com', 'member', 'a1111111-1111-4111-a111-111111111111',
        array['c1000000-0000-4000-a000-000000000001']::uuid[]);
reset role;
create temp table tok as select token from invitations where email = 'membro@teste.com';
grant select on tok to authenticated;

select is((select clientes from get_invitation_preview((select token from tok))), array['Padaria'],
  'prévia do convite mostra os clientes');

select pg_temp.login('b2222222-2222-4222-a222-222222222222', 'membro@teste.com');
select lives_ok($$ select accept_invitation((select token from tok)) $$, 'membro aceita o convite');

select is((select count(*)::int from clients), 1, 'membro vê só o cliente atribuído');
select is((select nome from clients), 'Padaria', 'e é o cliente certo');
select is((select count(*)::int from deliverables), 1, 'membro vê só posts do cliente atribuído');
select is((select count(*)::int from payments), 0, 'membro não vê o financeiro');
select throws_ok(
  $$ insert into clients (workspace_id, nome) values ((select ws from ids), 'Novo') $$,
  '42501', null, 'membro não cria cliente');
select throws_ok(
  $$ insert into deliverables (workspace_id, client_id, titulo)
     values ((select ws from ids), 'c1000000-0000-4000-a000-000000000002', 'Invasão') $$,
  '42501', null, 'membro não cria post em cliente não atribuído');
select throws_ok(
  $$ select set_member_clients((select ws from ids), 'b2222222-2222-4222-a222-222222222222',
       array['c1000000-0000-4000-a000-000000000002']::uuid[]) $$,
  '42501', null, 'membro não muda as próprias atribuições');

-- Dona atribui o segundo cliente
select pg_temp.login('a1111111-1111-4111-a111-111111111111', 'dona@teste.com');
select is((select count(*)::int from payments), 1, 'dona vê o financeiro');
select lives_ok(
  $$ select set_member_clients((select ws from ids), 'b2222222-2222-4222-a222-222222222222',
       array['c1000000-0000-4000-a000-000000000001', 'c1000000-0000-4000-a000-000000000002']::uuid[]) $$,
  'dona atribui clientes');
select pg_temp.login('b2222222-2222-4222-a222-222222222222', 'membro@teste.com');
select is((select count(*)::int from clients), 2, 'membro passa a ver os dois clientes');

-- Plano pro (2 lugares) cheio: convite fica guardado, mas o aceite espera lugar
select pg_temp.login('a1111111-1111-4111-a111-111111111111', 'dona@teste.com');
select lives_ok(
  $$ insert into invitations (workspace_id, email, role, invited_by)
     values ((select ws from ids), 'extra@teste.com', 'member', 'a1111111-1111-4111-a111-111111111111') $$,
  'convite com o plano cheio fica guardado');
reset role;
create temp table tok2 as select token from invitations where email = 'extra@teste.com';
grant select on tok2 to authenticated;
select pg_temp.login('c3333333-3333-4333-a333-333333333333', 'extra@teste.com');
select throws_ok($$ select accept_invitation((select token from tok2)) $$, 'P0001', null,
  'aceite espera lugar livre no plano');
reset role;
select is((select accepted_at from invitations where email = 'extra@teste.com'), null,
  'convite continua pendente');

select * from finish();
rollback;
