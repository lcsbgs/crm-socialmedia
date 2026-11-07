-- Financeiro: avulsas convivem com a mensalidade, generate_month segue idempotente, baixa pelo provedor e despesas só owner/admin.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(7);
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'dona@teste.com', '{"nome":"Dona"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-4222-a222-222222222222', 'authenticated', 'authenticated', 'membro@teste.com', '{"nome":"Membro"}', now(), now());
create temp table ids as select (select id from workspaces where owner_id = 'a1111111-1111-4111-a111-111111111111') as ws;
grant select on ids to authenticated;
update workspaces set plano = 'pro' where id = (select ws from ids);
insert into workspace_members (workspace_id, user_id, role) values ((select ws from ids), 'b2222222-2222-4222-a222-222222222222', 'member');
select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-a111-111111111111","role":"authenticated"}', true);
insert into clients (id, workspace_id, nome, valor_mensal, dia_vencimento) values ('c1000000-0000-4000-a000-000000000001', (select ws from ids), 'Padaria', 1200, 10);
select generate_month((select ws from ids), '2026-11-01');
select generate_month((select ws from ids), '2026-11-01');
select is((select count(*)::int from payments where origem = 'mensalidade'), 1, 'mensalidade não duplica');
insert into payments (workspace_id, client_id, competencia, valor, vencimento, origem, descricao, provider_id)
values ((select ws from ids), 'c1000000-0000-4000-a000-000000000001', '2026-11-01', 150, '2026-11-20', 'escopo', 'Reels extra', 'pay_1');
select is((select count(*)::int from payments), 2, 'avulsa convive com a mensalidade no mesmo mês');
insert into expenses (workspace_id, descricao, categoria, valor) values ((select ws from ids), 'Freelancer de vídeo', 'freelancer', 400);
select is((select count(*)::int from expenses), 1, 'dona lança despesa');

select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-a222-222222222222","role":"authenticated"}', true);
select is((select count(*)::int from expenses), 0, 'membro não vê despesas');

reset role; select set_config('request.jwt.claims', '', true);
select isnt(billing_mark_paid('pay_1', '2026-11-18', 'pix'), null, 'webhook dá baixa pelo id do provedor');
select is((select status::text from payments where provider_id = 'pay_1'), 'pago', 'cobrança fica paga');
select billing_set_invoice('pay_1', 'emitida', '123', 'https://nf/pdf', 'https://nf/xml', null, 'inv_1');
select is((select nfse_numero from payments where provider_id = 'pay_1'), '123', 'nota fiscal registrada');
select * from finish();
rollback;
