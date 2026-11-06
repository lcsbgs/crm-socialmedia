-- Posts e IA: versões, créditos e conexões com tokens protegidos.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'dona@teste.com', '{"nome":"Dona"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-4222-a222-222222222222', 'authenticated', 'authenticated', 'outra@teste.com', '{"nome":"Outra"}', now(), now());
create temp table ids as
select (select id from workspaces where owner_id = 'a1111111-1111-4111-a111-111111111111') as ws;
grant select on ids to authenticated;

select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-a111-111111111111","email":"dona@teste.com","role":"authenticated"}', true);
insert into clients (id, workspace_id, nome) values ('c1000000-0000-4000-a000-000000000001', (select ws from ids), 'Padaria');
insert into deliverables (id, workspace_id, client_id, titulo, legenda)
values ('d1000000-0000-4000-a000-000000000001', (select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'Pão', 'Legenda 1');

select is(create_deliverable_version('d1000000-0000-4000-a000-000000000001', 'upload'), 1, 'primeira versão é a 1');
update deliverables set legenda = 'Legenda 2' where id = 'd1000000-0000-4000-a000-000000000001';
select is(create_deliverable_version('d1000000-0000-4000-a000-000000000001'), 2, 'segunda versão é a 2');
select is((select legenda from deliverable_versions where numero = 1), 'Legenda 1', 'versão guarda a legenda da época');

update deliverables set status = 'ajuste' where id = 'd1000000-0000-4000-a000-000000000001';
select is((select status::text from deliverables where id = 'd1000000-0000-4000-a000-000000000001'), 'ajuste', 'etapa Ajuste pedido existe');

insert into ai_usage (workspace_id, user_id, provider, tarefa, creditos)
values ((select ws from ids), 'a1111111-1111-4111-a111-111111111111', 'mock', 'legenda', 3);
select is((select usados from ai_credits_status((select ws from ids))), 3, 'créditos usados no mês somam o uso');
select is((select limite from ai_credits_status((select ws from ids))), 100, 'plano grátis tem 100 créditos');

insert into ai_connections (user_id, provider, access_token_enc, simulated)
values ('a1111111-1111-4111-a111-111111111111', 'chatgpt', 'cifrado', true);
select throws_ok($$ select access_token_enc from ai_connections $$, '42501', null, 'token cifrado não sai pela API');
select is((select access_token_enc from get_ai_connection_secret('chatgpt')), 'cifrado', 'dono lê o próprio token pelo servidor');

select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-a222-222222222222","email":"outra@teste.com","role":"authenticated"}', true);
select is((select count(*)::int from get_ai_connection_secret('chatgpt')), 0, 'outra pessoa não lê o token');

select * from finish();
rollback;
