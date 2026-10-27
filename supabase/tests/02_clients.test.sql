-- Clientes, pacotes, generate_month e limite de clientes.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(29);

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

-- Pacote: 2 posts por semana + 1 relatório mensal
insert into package_templates (id, workspace_id, nome, itens) values (
  'aaaaaaaa-0000-4000-a000-000000000001', (select ws_ana from ids), 'Básico',
  '[{"tipo":"Post","quantidade":2,"cadencia":"semanal"},{"tipo":"Relatório","quantidade":1,"cadencia":"mensal"},{"tipo":"Stories","quantidade":1,"cadencia":"diaria"}]'
);
insert into package_templates (id, workspace_id, nome, itens) values (
  'bbbbbbbb-0000-4000-a000-000000000001', (select ws_bia from ids), 'Da Bia', '[]'
);

-- ------------------------------------------------------------
-- Limite free: 2 clientes
-- ------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-a111-111111111111', 'ana@teste.com');

select lives_ok(
  $$ insert into clients (id, workspace_id, nome, package_template_id, valor_mensal, dia_vencimento)
     values ('cccccccc-0000-4000-a000-000000000001', (select ws_ana from ids), 'Padaria',
             'aaaaaaaa-0000-4000-a000-000000000001', 1500, 10) $$,
  'free permite o 1º cliente');
select lives_ok(
  $$ insert into clients (id, workspace_id, nome, valor_mensal, dia_vencimento)
     values ('cccccccc-0000-4000-a000-000000000002', (select ws_ana from ids), 'Academia', 900, 31) $$,
  'free permite o 2º cliente');
select throws_ok(
  $$ insert into clients (workspace_id, nome) values ((select ws_ana from ids), 'Clínica') $$,
  'P0001', null, 'free bloqueia o 3º cliente');

update clients set status = 'encerrado' where id = 'cccccccc-0000-4000-a000-000000000002';
select lives_ok(
  $$ insert into clients (id, workspace_id, nome) values
     ('cccccccc-0000-4000-a000-000000000003', (select ws_ana from ids), 'Clínica') $$,
  'cliente encerrado libera vaga');
select throws_ok(
  $$ update clients set status = 'ativo' where id = 'cccccccc-0000-4000-a000-000000000002' $$,
  'P0001', null, 'reativar cliente respeita o limite');
delete from clients where id = 'cccccccc-0000-4000-a000-000000000003';
update clients set status = 'ativo' where id = 'cccccccc-0000-4000-a000-000000000002';

select throws_ok(
  $$ update clients set package_template_id = 'bbbbbbbb-0000-4000-a000-000000000001'
     where id = 'cccccccc-0000-4000-a000-000000000001' $$,
  '23503', null, 'cliente não usa pacote de outro workspace');

-- ------------------------------------------------------------
-- generate_month
-- ------------------------------------------------------------
-- Novembro/2026: segundas em 2, 9, 16, 23, 30.
-- 5 semanas x 2 posts + 1 relatório + 5 "Stories da semana" = 16 slots de entrega.
select results_eq(
  $$ select entregas_criadas, cobrancas_criadas from generate_month((select ws_ana from ids), '2026-11-15') $$,
  $$ values (16, 2) $$,
  'generate_month cria slots de entrega e cobranças');
select results_eq(
  $$ select entregas_criadas, cobrancas_criadas from generate_month((select ws_ana from ids), '2026-11-01') $$,
  $$ values (0, 0) $$,
  'generate_month é idempotente');
select is((select count(*)::int from deliverables where competencia = '2026-11-01'), 16, 'sem slots duplicados');
select is((select count(*)::int from payments where competencia = '2026-11-01'), 2, 'sem cobranças duplicadas');
select is((select vencimento from payments where client_id = 'cccccccc-0000-4000-a000-000000000002'),
  '2026-11-30'::date, 'dia de vencimento 31 vira o último dia do mês');
select results_eq(
  $$ select slot_label, titulo, formato::text, status::text from deliverables
     where slot_key = '1:1' and competencia = '2026-11-01' $$,
  $$ values ('Post 1 de 10', null::text, 'post', 'planejar') $$,
  'slot é rascunho sem título, numerado e no formato do tipo');
select is((select formato::text from deliverables where slot_key = '2:1' and competencia = '2026-11-01'), 'relatorio',
  'tipo Relatório vira formato relatório');
select is((select slot_label from deliverables where slot_key = '3:2' and competencia = '2026-11-01'),
  'Stories da semana 2 de 5', 'cadência diária vira uma entrega por semana');
select ok((select bool_and(data_publicacao between '2026-11-01' and '2026-11-30') from deliverables where competencia = '2026-11-01'),
  'todas as datas dentro do mês');
select is((select count(*)::int from tasks where origem = 'template'), 0, 'generate_month não cria mais tarefas');

-- Título real preserva o slot na próxima geração (não duplica nem sobrescreve)
update deliverables set titulo = 'Promoção de Natal' where slot_key = '1:1' and competencia = '2026-11-01';
select results_eq(
  $$ select entregas_criadas from generate_month((select ws_ana from ids), '2026-11-01') $$,
  $$ values (0) $$,
  'slot com título continua contando como gerado');

-- Cliente pausado não gera
update clients set status = 'pausado' where id = 'cccccccc-0000-4000-a000-000000000001';
select results_eq(
  $$ select entregas_criadas, cobrancas_criadas from generate_month((select ws_ana from ids), '2026-12-01') $$,
  $$ values (0, 1) $$,
  'cliente pausado não gera entregas nem cobrança');

-- Tarefa operacional concluída preenche done_at e entra na linha do tempo
insert into tasks (workspace_id, client_id, titulo) values
  ((select ws_ana from ids), 'cccccccc-0000-4000-a000-000000000001', 'Cobrar fotos do cardápio');
update tasks set status = 'feita' where titulo = 'Cobrar fotos do cardápio';
select isnt((select done_at from tasks where titulo = 'Cobrar fotos do cardápio'), null,
  'done_at preenchido ao concluir');
select ok(exists(select 1 from client_timeline where tipo = 'tarefa_feita'), 'linha do tempo mostra tarefa concluída');

-- Entrega avulsa precisa de título
select throws_ok(
  $$ insert into deliverables (workspace_id, client_id, titulo) values
     ((select ws_ana from ids), 'cccccccc-0000-4000-a000-000000000001', null) $$,
  '23514', null, 'entrega sem título e sem slot é recusada');

-- ------------------------------------------------------------
-- Isolamento
-- ------------------------------------------------------------
reset role; select pg_temp.login('22222222-2222-4222-a222-222222222222', 'bia@teste.com');

select is((select count(*)::int from clients), 0, 'Bia não vê clientes da Ana');
select is((select count(*)::int from tasks), 0, 'Bia não vê tarefas da Ana');
select is((select count(*)::int from payments), 0, 'Bia não vê cobranças da Ana');
select is((select count(*)::int from package_templates), 1, 'Bia só vê o próprio pacote');
select is((select count(*)::int from client_timeline), 0, 'Bia não vê a linha do tempo da Ana');

select throws_ok(
  $$ insert into clients (workspace_id, nome) values ((select ws_ana from ids), 'Invasor') $$,
  '42501', null, 'Bia não cria cliente no workspace da Ana');
select throws_ok(
  $$ select generate_month((select ws_ana from ids), '2027-01-01') $$,
  '42501', null, 'Bia não gera o mês da Ana');

update payments set status = 'pago' where workspace_id = (select ws_ana from ids);
reset role; select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from payments where status = 'pago'), 0, 'Bia não altera cobranças da Ana');

select * from finish();
rollback;
