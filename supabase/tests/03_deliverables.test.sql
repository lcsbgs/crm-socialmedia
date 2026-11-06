-- Entregas e mídia no Storage: isolamento entre workspaces.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

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

insert into clients (id, workspace_id, nome)
values ('cccccccc-0000-4000-a000-000000000001', (select ws_ana from ids), 'Padaria');
insert into clients (id, workspace_id, nome)
values ('cccccccc-0000-4000-a000-000000000002', (select ws_bia from ids), 'Academia');

select pg_temp.login('11111111-1111-4111-a111-111111111111', 'ana@teste.com');

select lives_ok(
  $$ insert into deliverables (id, workspace_id, client_id, titulo, formato)
     values ('dddddddd-0000-4000-a000-000000000001', (select ws_ana from ids),
             'cccccccc-0000-4000-a000-000000000001', 'Post de lançamento', 'post') $$,
  'Ana cria entrega');
select throws_ok(
  $$ insert into deliverables (workspace_id, client_id, titulo)
     values ((select ws_ana from ids), 'cccccccc-0000-4000-a000-000000000002', 'Cliente alheio') $$,
  '42501', null, 'entrega não aponta para cliente de outro workspace');

-- status_changed_at muda junto com o status
update deliverables set status_changed_at = now() - interval '5 days' where id = 'dddddddd-0000-4000-a000-000000000001';
update deliverables set status = 'em_aprovacao' where id = 'dddddddd-0000-4000-a000-000000000001';
select ok((select status_changed_at > now() - interval '1 minute' from deliverables
           where id = 'dddddddd-0000-4000-a000-000000000001'), 'status_changed_at atualizado');
select ok(exists(select 1 from client_timeline where tipo = 'entrega_em_aprovacao'),
  'linha do tempo mostra envio para aprovação');

-- Storage: Ana envia no próprio workspace
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name, owner)
            values ('midia', '%s/cccccccc-0000-4000-a000-000000000001/dddddddd-0000-4000-a000-000000000001/a.jpg',
                    '11111111-1111-4111-a111-111111111111') $$, (select ws_ana from ids)),
  'Ana envia mídia no próprio workspace');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner)
            values ('midia', '%s/x/y/b.jpg', '11111111-1111-4111-a111-111111111111') $$, (select ws_bia from ids)),
  '42501', null, 'Ana não envia mídia no workspace da Bia');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('midia', 'sem-workspace/c.jpg', '11111111-1111-4111-a111-111111111111') $$,
  '42501', null, 'caminho sem workspace é recusado');

-- Bia não vê nem altera
reset role; select pg_temp.login('22222222-2222-4222-a222-222222222222', 'bia@teste.com');
select is((select count(*)::int from deliverables), 0, 'Bia não vê entregas da Ana');
select is((select count(*)::int from storage.objects where bucket_id = 'midia'), 0, 'Bia não vê mídia da Ana');
update deliverables set titulo = 'Hackeado';
select throws_ok(
  $$ insert into deliverables (workspace_id, client_id, titulo)
     values ((select ws_ana from ids), 'cccccccc-0000-4000-a000-000000000001', 'Invasão') $$,
  '42501', null, 'Bia não cria entrega no workspace da Ana');

reset role; select set_config('request.jwt.claims', '', true);
select is((select titulo from deliverables where id = 'dddddddd-0000-4000-a000-000000000001'),
  'Post de lançamento', 'Bia não altera entrega da Ana');

select * from finish();
rollback;
