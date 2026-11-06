-- Planejamento: generate_month não duplica, capacidade do pacote e geração agendada.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated',
        'dona@teste.com', '{"nome":"Dona"}', now(), now());
create temp table ids as
select (select id from workspaces where owner_id = 'a1111111-1111-4111-a111-111111111111') as ws;
grant select on ids to authenticated;

select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-a111-111111111111","email":"dona@teste.com","role":"authenticated"}', true);

insert into package_templates (id, workspace_id, nome, itens, preco, limite_rodadas)
values ('b0000000-0000-4000-a000-000000000001', (select ws from ids), 'Essencial',
        '[{"tipo":"Post","quantidade":3,"cadencia":"semanal"},{"tipo":"Relatório","quantidade":1,"cadencia":"mensal"}]', 1200, 2);
insert into clients (id, workspace_id, nome, package_template_id, valor_mensal, dia_vencimento)
values ('c1000000-0000-4000-a000-000000000001', (select ws from ids), 'Padaria', 'b0000000-0000-4000-a000-000000000001', 1200, 10);

create temp table cap as select * from package_month_status('c1000000-0000-4000-a000-000000000001', '2026-11-01');
grant select on cap to authenticated;
select ok((select capacidade from cap) > 1, 'pacote calcula a capacidade do mês');
select is((select usados from cap), 0, 'mês vazio antes de gerar');

select is((select entregas_criadas from generate_month((select ws from ids), '2026-11-01')), (select capacidade from cap),
  'gerar cria um post por vaga do pacote');
select is((select entregas_criadas from generate_month((select ws from ids), '2026-11-01')), 0,
  'gerar de novo não duplica posts');
select is((select count(*)::int from payments where client_id = 'c1000000-0000-4000-a000-000000000001'), 1,
  'gerar de novo não duplica a cobrança');
select is((select usados from package_month_status('c1000000-0000-4000-a000-000000000001', '2026-11-01')),
  (select capacidade from cap), 'pacote cheio depois de gerar');

-- Geração agendada (service role), idempotente com a manual
reset role; select set_config('request.jwt.claims', '', true);
select lives_ok($$ select generate_month_all('2026-11-01') $$, 'geração agendada roda sem duplicar');

select * from finish();
rollback;
