-- Isolamento entre workspaces, papéis e limites de plano (membros).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(34);

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
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
select pg_temp.create_user('33333333-3333-4333-a333-333333333333', 'caio@teste.com', 'Caio');

create temp table ids as
select
  (select id from workspaces where owner_id = '11111111-1111-4111-a111-111111111111') as ws_ana,
  (select slug from workspaces where owner_id = '11111111-1111-4111-a111-111111111111') as slug_ana,
  (select id from workspaces where owner_id = '22222222-2222-4222-a222-222222222222') as ws_bia;
grant select on ids to authenticated;

-- ------------------------------------------------------------
-- Cadastro cria perfil e workspace pessoal
-- ------------------------------------------------------------
select is((select nome from profiles where id = '11111111-1111-4111-a111-111111111111'), 'Ana',
  'cadastro cria o perfil com o nome');
select is((select nome from workspaces where id = (select ws_ana from ids)), 'Workspace de Ana',
  'cadastro cria o workspace pessoal');
select is((select role::text from workspace_members
           where workspace_id = (select ws_ana from ids) and user_id = '11111111-1111-4111-a111-111111111111'),
  'owner', 'criador é owner');
select is((select last_workspace_id from profiles where id = '11111111-1111-4111-a111-111111111111'),
  (select ws_ana from ids), 'last_workspace_id aponta para o workspace pessoal');

-- ------------------------------------------------------------
-- Isolamento: Bia não lê nem escreve no workspace da Ana
-- ------------------------------------------------------------
reset role; select pg_temp.login('22222222-2222-4222-a222-222222222222', 'bia@teste.com');

select is((select count(*)::int from workspaces), 1, 'Bia só vê o próprio workspace');
select is((select count(*)::int from workspace_members where workspace_id = (select ws_ana from ids)), 0,
  'Bia não vê membros da Ana');
select is((select count(*)::int from profiles where id = '11111111-1111-4111-a111-111111111111'), 0,
  'Bia não vê o perfil da Ana');

update workspaces set nome = 'Hackeado' where id = (select ws_ana from ids);
reset role; select set_config('request.jwt.claims', '', true);
select is((select nome from workspaces where id = (select ws_ana from ids)), 'Workspace de Ana',
  'Bia não renomeia o workspace da Ana');

reset role; select pg_temp.login('22222222-2222-4222-a222-222222222222', 'bia@teste.com');
select throws_ok(
  $$ insert into invitations (workspace_id, email, role, invited_by)
     values ((select ws_ana from ids), 'bia2@teste.com', 'member', '22222222-2222-4222-a222-222222222222') $$,
  '42501', null, 'Bia não cria convite no workspace da Ana');

delete from workspaces where id = (select ws_ana from ids);
select throws_ok(
  $$ insert into workspace_members (workspace_id, user_id, role)
     values ((select ws_ana from ids), '22222222-2222-4222-a222-222222222222', 'admin') $$,
  '42501', null, 'Bia não se adiciona como membro da Ana');

select throws_ok(
  $$ update profiles set last_workspace_id = (select ws_ana from ids)
     where id = '22222222-2222-4222-a222-222222222222' $$,
  '42501', null, 'Bia não aponta last_workspace_id para workspace alheio');

reset role; select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from workspaces where id = (select ws_ana from ids)), 1,
  'Bia não exclui o workspace da Ana');

-- ------------------------------------------------------------
-- Colunas protegidas
-- ------------------------------------------------------------
reset role; select pg_temp.login('11111111-1111-4111-a111-111111111111', 'ana@teste.com');
select throws_ok(
  $$ update workspaces set plano = 'estudio' where id = (select ws_ana from ids) $$,
  '42501', null, 'owner não altera o próprio plano pela API');
select lives_ok(
  $$ update workspaces set nome = 'Estúdio Ana' where id = (select ws_ana from ids) $$,
  'owner renomeia o workspace');

-- ------------------------------------------------------------
-- Limite do plano free: 1 usuário
-- ------------------------------------------------------------
select lives_ok(
  $$ insert into invitations (workspace_id, email, role, invited_by)
     values ((select ws_ana from ids), 'zeca@teste.com', 'member', '11111111-1111-4111-a111-111111111111') $$,
  'free aceita convite além do limite (fica esperando lugar)');
reset role;
delete from invitations where email = 'zeca@teste.com';
select pg_temp.login('11111111-1111-4111-a111-111111111111', 'ana@teste.com');

reset role; select set_config('request.jwt.claims', '', true);
select throws_ok(
  $$ insert into workspace_members (workspace_id, user_id, role)
     values ((select ws_ana from ids), '22222222-2222-4222-a222-222222222222', 'member') $$,
  'P0001', null, 'free bloqueia o 2º membro mesmo direto no banco');

-- ------------------------------------------------------------
-- Plano pro: 2 usuários, convite pendente conta no limite
-- ------------------------------------------------------------
update workspaces set plano = 'pro' where id = (select ws_ana from ids);

reset role; select pg_temp.login('11111111-1111-4111-a111-111111111111', 'ana@teste.com');
select lives_ok(
  $$ insert into invitations (workspace_id, email, role, invited_by)
     values ((select ws_ana from ids), 'bia@teste.com', 'admin', '11111111-1111-4111-a111-111111111111') $$,
  'pro permite convidar o 2º membro');
select lives_ok(
  $$ insert into invitations (workspace_id, email, role, invited_by)
     values ((select ws_ana from ids), 'caio@teste.com', 'member', '11111111-1111-4111-a111-111111111111') $$,
  'convite além do limite do pro fica esperando lugar');
reset role;
delete from invitations where email = 'caio@teste.com';
select pg_temp.login('11111111-1111-4111-a111-111111111111', 'ana@teste.com');

reset role;
create temp table bia_token as select token from invitations where email = 'bia@teste.com';
grant select on bia_token to authenticated;

-- Caio não aceita convite enviado para outro e-mail
select pg_temp.login('33333333-3333-4333-a333-333333333333', 'caio@teste.com');
select throws_ok(
  format('select accept_invitation(%L)', (select token from bia_token)),
  '42501', null, 'convite não pode ser aceito por outro e-mail');

-- Bia aceita
reset role; select pg_temp.login('22222222-2222-4222-a222-222222222222', 'bia@teste.com');

select is(accept_invitation((select token from bia_token)), (select slug_ana from ids),
  'aceitar convite retorna o slug');
select is((select count(*)::int from workspaces), 2, 'Bia passa a ver o workspace da Ana');
select is((select count(*)::int from profiles where id = '11111111-1111-4111-a111-111111111111'), 1,
  'Bia passa a ver o perfil da Ana');
select throws_ok(
  format('select accept_invitation(%L)', (select token from bia_token)),
  '22023', null, 'convite não pode ser reutilizado');

-- Admin não remove o owner
delete from workspace_members
where workspace_id = (select ws_ana from ids) and user_id = '11111111-1111-4111-a111-111111111111';
reset role; select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from workspace_members where workspace_id = (select ws_ana from ids)), 2,
  'admin não remove o owner');

-- Admin não exclui o workspace
reset role; select pg_temp.login('22222222-2222-4222-a222-222222222222', 'bia@teste.com');
delete from workspaces where id = (select ws_ana from ids);
reset role; select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from workspaces where id = (select ws_ana from ids)), 1,
  'admin não exclui o workspace');

-- Membro sai do workspace
reset role; select pg_temp.login('22222222-2222-4222-a222-222222222222', 'bia@teste.com');
delete from workspace_members
where workspace_id = (select ws_ana from ids) and user_id = '22222222-2222-4222-a222-222222222222';
select is((select count(*)::int from workspaces), 1, 'Bia sai do workspace da Ana');

-- Onboarding renomeia e gera slug uma única vez; slug não muda por update direto
reset role; select pg_temp.login('33333333-3333-4333-a333-333333333333', 'caio@teste.com');
select is(complete_onboarding('Caio Silva', 'Agência Caio'), 'agencia-caio', 'onboarding gera slug pelo nome');
select is((select nome from profiles where id = '33333333-3333-4333-a333-333333333333'), 'Caio Silva',
  'onboarding salva o nome');
select throws_ok($$ select complete_onboarding('Caio', 'Outro') $$, '22023', null,
  'onboarding não roda duas vezes');
select throws_ok(
  $$ update workspaces set slug = 'outro-slug' where owner_id = '33333333-3333-4333-a333-333333333333' $$,
  '42501', null, 'slug não muda por update direto');
reset role; select set_config('request.jwt.claims', '', true);

-- Funções internas não são chamáveis pela API
select ok(not has_function_privilege('authenticated', 'public.create_workspace_for(uuid, text)', 'execute'),
  'authenticated não executa create_workspace_for');
select ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'authenticated não executa handle_new_user');
select ok(not has_function_privilege('anon', 'public.is_workspace_member(uuid)', 'execute'),
  'anon não executa is_workspace_member');
select ok(not has_table_privilege('anon', 'public.workspaces', 'select'),
  'anon não lê workspaces');

select * from finish();
rollback;
