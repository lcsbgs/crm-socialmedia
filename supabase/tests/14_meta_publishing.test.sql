-- Publicação: token protegido, agendar, fila com backoff e conclusão.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'dona@teste.com', '{"nome":"Dona"}', now(), now());
create temp table ids as select (select id from workspaces where owner_id = 'a1111111-1111-4111-a111-111111111111') as ws;
grant select on ids to authenticated;

select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-a111-111111111111","email":"dona@teste.com","role":"authenticated"}', true);
insert into clients (id, workspace_id, nome) values ('c1000000-0000-4000-a000-000000000001', (select ws from ids), 'Padaria');
insert into deliverables (id, workspace_id, client_id, titulo, status)
values ('d1000000-0000-4000-a000-000000000001', (select ws from ids), 'c1000000-0000-4000-a000-000000000001', 'Pão', 'aprovado');
insert into social_connections (id, workspace_id, provider, access_token_enc, simulated)
values ('e1000000-0000-4000-a000-000000000001', (select ws from ids), 'facebook', 'cifrado', true);
insert into social_accounts (id, workspace_id, connection_id, client_id, plataforma, external_id, nome)
values ('f1000000-0000-4000-a000-000000000001', (select ws from ids), 'e1000000-0000-4000-a000-000000000001',
        'c1000000-0000-4000-a000-000000000001', 'instagram', '17841', '@paoquente');

select throws_ok($$ select access_token_enc from social_connections $$, '42501', null, 'token da Meta não sai pela API');
select throws_ok($$ select schedule_deliverable('d1000000-0000-4000-a000-000000000001', '{}', now() + interval '1 hour') $$,
  '22023', null, 'agendar exige escolher conta');
select is(schedule_deliverable('d1000000-0000-4000-a000-000000000001', array['f1000000-0000-4000-a000-000000000001']::uuid[], now() + interval '1 hour'),
  1, 'agendar cria um job por conta');
select is((select status::text from deliverables where id = 'd1000000-0000-4000-a000-000000000001'), 'agendado', 'post fica agendado');

reset role; select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from claim_publish_jobs(10)), 0, 'job do futuro não é pego');
update publish_jobs set agendado_para = now() - interval '1 minute';
create temp table j as select * from claim_publish_jobs(10);
select is((select count(*)::int from j), 1, 'job vencido é pego');
select is((select count(*)::int from claim_publish_jobs(10)), 0, 'job em processamento não é pego de novo');

select fail_publish_job((select id from j), 'rede', 'Falha de rede', true);
select is((select status from publish_jobs), 'pendente', 'erro recuperável volta para a fila');
select ok((select proxima_tentativa_em > now() from publish_jobs), 'com espera antes da próxima tentativa');

update publish_jobs set proxima_tentativa_em = now() - interval '1 second';
select id from claim_publish_jobs(10);
select complete_publish_job((select id from j), 'ig_123', 'https://instagram.com/p/x', true);
select is((select status::text from deliverables where id = 'd1000000-0000-4000-a000-000000000001'), 'publicado', 'post vai para Publicado');
select is((select external_id from published_posts), 'ig_123', 'publicação registrada');

insert into publish_jobs (workspace_id, deliverable_id, social_account_id, agendado_para, tentativas)
values ((select ws from ids), 'd1000000-0000-4000-a000-000000000001', 'f1000000-0000-4000-a000-000000000001', now(), 1);
select fail_publish_job((select id from publish_jobs where status = 'pendente'), '190', 'Token expirado, reconecte o Instagram', false);
select is((select count(*)::int from notifications where tipo = 'publicacao'), 1, 'erro definitivo avisa a equipe');

select * from finish();
rollback;
