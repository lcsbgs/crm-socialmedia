-- Página do cliente: estratégia, kit, arquivos, linha do tempo e briefing público.
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

select pg_temp.create_user('a1111111-1111-4111-a111-111111111111', 'dona@teste.com', 'Dona');
select pg_temp.create_user('b2222222-2222-4222-a222-222222222222', 'membro@teste.com', 'Membro');
select pg_temp.create_user('c3333333-3333-4333-a333-333333333333', 'outra@teste.com', 'Outra');
create temp table ids as
select (select id from workspaces where owner_id = 'a1111111-1111-4111-a111-111111111111') as ws;
grant select on ids to authenticated;
update workspaces set plano = 'pro' where id = (select ws from ids);
insert into workspace_members (workspace_id, user_id, role)
values ((select ws from ids), 'b2222222-2222-4222-a222-222222222222', 'member');

select pg_temp.login('a1111111-1111-4111-a111-111111111111', 'dona@teste.com');
insert into clients (id, workspace_id, nome) values ('c1000000-0000-4000-a000-000000000001', (select ws from ids), 'Padaria');
insert into client_strategies (client_id, workspace_id, objetivo, pilares)
values ('c1000000-0000-4000-a000-000000000001', (select ws from ids), 'Vender mais encomendas',
        '[{"nome":"Produto","pct":40},{"nome":"Bastidores","pct":60}]');
insert into brand_kits (client_id, workspace_id, tom) values ('c1000000-0000-4000-a000-000000000001', (select ws from ids), '{acolhedor}');
insert into timeline_events (workspace_id, client_id, titulo, autor_id)
values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'Ligação com a Mariana', 'a1111111-1111-4111-a111-111111111111');

select is((select count(*)::int from client_timeline where tipo = 'nota'), 1, 'evento manual aparece na linha do tempo');

-- Membro sem atribuição não vê estratégia nem kit
select pg_temp.login('b2222222-2222-4222-a222-222222222222', 'membro@teste.com');
select is((select count(*)::int from client_strategies), 0, 'membro sem o cliente não vê a estratégia');
select is((select count(*)::int from brand_kits), 0, 'membro sem o cliente não vê o kit');
select throws_ok(
  $$ insert into timeline_events (workspace_id, client_id, titulo, autor_id)
     values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'x', 'b2222222-2222-4222-a222-222222222222') $$,
  '42501', null, 'membro sem o cliente não registra evento');

-- Outro espaço não vê nada
select pg_temp.login('c3333333-3333-4333-a333-333333333333', 'outra@teste.com');
select is((select count(*)::int from client_timeline), 0, 'outro espaço não vê a linha do tempo');

-- Briefing público pelo servidor
reset role; select set_config('request.jwt.claims', '', true);
create temp table tok as select briefing_token as t from clients where id = 'c1000000-0000-4000-a000-000000000001';
select is((select client_nome from get_briefing_form((select t from tok))), 'Padaria', 'formulário de briefing acha o cliente pelo token');
select lives_ok($$ select submit_briefing((select t from tok), '{"objetivo":"vender"}'::jsonb, 'Mariana') $$, 'cliente responde o briefing');
select isnt((select briefing_respondido_em from clients where id = 'c1000000-0000-4000-a000-000000000001'), null, 'resposta fica gravada');
select is((select count(*)::int from timeline_events where tipo = 'briefing'), 1, 'resposta entra na linha do tempo');

select * from finish();
rollback;
