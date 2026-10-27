-- Escopo e financeiro: isolamento e consistência de pagamentos.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

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
insert into payments (id, workspace_id, client_id, competencia, valor, vencimento)
values ('99999999-0000-4000-a000-000000000001', (select ws_ana from ids),
        'cccccccc-0000-4000-a000-000000000001', '2026-01-01', 1000, '2026-01-10');

select pg_temp.login('11111111-1111-4111-a111-111111111111', 'ana@teste.com');
select lives_ok(
  $$ insert into scope_requests (workspace_id, client_id, descricao, valor_sugerido)
     values ((select ws_ana from ids), 'cccccccc-0000-4000-a000-000000000001', 'Vídeo institucional', 800) $$,
  'Ana registra pedido extra');
update scope_requests set status = 'cobrado';
select isnt((select resolvido_em from scope_requests), null, 'resolvido_em preenchido ao cobrar');
update scope_requests set status = 'pendente';
select is((select resolvido_em from scope_requests), null, 'reabrir limpa resolvido_em');

select throws_ok(
  $$ update payments set status = 'pago' where id = '99999999-0000-4000-a000-000000000001' $$,
  '23514', null, 'pago exige pago_em');
select lives_ok(
  $$ update payments set status = 'pago', pago_em = '2026-01-12' where id = '99999999-0000-4000-a000-000000000001' $$,
  'marca como pago com data');

reset role; select pg_temp.login('22222222-2222-4222-a222-222222222222', 'bia@teste.com');
select is((select count(*)::int from scope_requests), 0, 'Bia não vê pedidos da Ana');
select throws_ok(
  $$ insert into scope_requests (workspace_id, client_id, descricao)
     values ((select ws_ana from ids), 'cccccccc-0000-4000-a000-000000000001', 'Invasão') $$,
  '42501', null, 'Bia não cria pedido no workspace da Ana');

reset role; select set_config('request.jwt.claims', '', true);
select ok(not has_function_privilege('authenticated', 'public.mark_overdue_payments()', 'execute'),
  'mark_overdue_payments não é exposta à API');

update payments set status = 'pendente', pago_em = null;
select ok(mark_overdue_payments() >= 1, 'mark_overdue_payments roda');
select is((select status::text from payments where id = '99999999-0000-4000-a000-000000000001'), 'atrasado',
  'cobrança vencida fica atrasada');

select * from finish();
rollback;
