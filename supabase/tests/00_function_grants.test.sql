-- Guarda geral: nenhuma função security definer do schema public fica exposta
-- além da lista conhecida. Pega grants padrão do Supabase em funções novas.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(3);

select is_empty(
  $$ select p.oid::regprocedure::text
     from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and has_function_privilege('anon', p.oid, 'execute')
       and p.prokind = 'f'
       and p.prorettype <> 'trigger'::regtype $$,
  'anon não executa nenhuma função do schema public');

select set_eq(
  $$ select p.proname::text
     from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.prosecdef
       and has_function_privilege('authenticated', p.oid, 'execute') $$,
  array[
    'is_workspace_member', 'has_workspace_role', 'shares_workspace_with', 'create_workspace',
    'complete_onboarding', 'get_invitation', 'accept_invitation', 'workspace_usage',
    'generate_month', 'can_access_media',
    'is_workspace_admin', 'can_access_client', 'can_access_deliverable', 'set_member_clients',
    'save_studio_step', 'finish_onboarding', 'regenerate_briefing_token', 'package_month_status',
    'create_deliverable_version', 'get_ai_connection_secret', 'workspace_ai_connections', 'ai_credits_status'
  ],
  'authenticated só executa as funções security definer previstas');

select set_eq(
  $$ select p.proname::text
     from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.prosecdef
       and has_function_privilege('service_role', p.oid, 'execute')
       and not has_function_privilege('authenticated', p.oid, 'execute')
       and p.prorettype <> 'trigger'::regtype $$,
  array['portal_respond', 'mark_overdue_payments', 'create_workspace_for', 'workspace_seat_usage',
        'get_invitation_preview', 'get_briefing_form', 'submit_briefing', 'get_brand_kit_public', 'generate_month_all'],
  'funções internas ficam só para service_role');

select * from finish();
rollback;
