-- Comercial: só owner/admin, visualização, aceite, assinatura vira cliente e renovação.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(11);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'dona@teste.com', '{"nome":"Dona"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-4222-a222-222222222222', 'authenticated', 'authenticated', 'membro@teste.com', '{"nome":"Membro"}', now(), now());
create temp table ids as select (select id from workspaces where owner_id = 'a1111111-1111-4111-a111-111111111111') as ws;
grant select on ids to authenticated;
update workspaces set plano = 'pro' where id = (select ws from ids);
insert into workspace_members (workspace_id, user_id, role) values ((select ws from ids), 'b2222222-2222-4222-a222-222222222222', 'member');

select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-a111-111111111111","role":"authenticated"}', true);
insert into leads (id, workspace_id, nome, contato_nome, telefone) values ('11000000-0000-4000-a000-000000000001', (select ws from ids), 'Café Bem-te-vi', 'Ana', '54999990000');
insert into proposals (id, workspace_id, lead_id, valor_mensal, status) values
  ('22000000-0000-4000-a000-000000000001', (select ws from ids), '11000000-0000-4000-a000-000000000001', 1500, 'enviada');
select is((select count(*)::int from leads), 1, 'dona vê o funil');

select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-a222-222222222222","role":"authenticated"}', true);
select is((select count(*)::int from leads), 0, 'membro não vê o comercial');
select is((select count(*)::int from proposals), 0, 'membro não vê propostas');

reset role; select set_config('request.jwt.claims', '', true);
create temp table tok as select token from proposals;
select register_proposal_view((select token from tok), '1.1.1.1', 'Safari');
select register_proposal_view((select token from tok), '1.1.1.1', 'Safari');
select is((select count(*)::int from proposal_views), 2, 'cada abertura é registrada');
select is((select count(*)::int from notifications where titulo like '%abriu a proposta'), 1, 'avisa só a primeira abertura do dia');

select lives_ok($$ select accept_proposal((select token from tok), 'Ana', '1.1.1.1') $$, 'cliente aceita a proposta');
select throws_ok($$ select accept_proposal((select token from tok), 'Ana', '1.1.1.1') $$, '22023', null, 'não aceita duas vezes');

insert into contracts (id, workspace_id, lead_id, proposal_id, corpo, status, fim)
values ('33000000-0000-4000-a000-000000000001', (select ws from ids), '11000000-0000-4000-a000-000000000001',
        '22000000-0000-4000-a000-000000000001', 'Contrato...', 'enviado', (now() + interval '20 days')::date);
create temp table ctok as select token from contracts;
select isnt(sign_contract((select token from ctok), 'Ana', '1.1.1.1'), null, 'assinatura cria o cliente');
select is((select valor_mensal::int from clients where nome = 'Café Bem-te-vi'), 1500, 'cliente nasce com o valor da proposta');
select is((select etapa from leads), 'ganho', 'lead vira ganho');
select is(run_contract_renewals(), 1, 'contrato perto do fim gera aviso de renovação');

select * from finish();
rollback;
