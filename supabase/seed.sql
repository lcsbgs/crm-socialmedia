-- Seed local. Login: demo@exemplo.com / demo123456
-- O trigger on_auth_user_created cria o perfil e o workspace pessoal.

do $$
declare
  demo_id uuid := '00000000-0000-4000-a000-000000000001';
  ws_id uuid;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', demo_id, 'authenticated', 'authenticated',
    'demo@exemplo.com', extensions.crypt('demo123456', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"nome":"Ana Demo"}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), demo_id, demo_id::text, 'email',
    jsonb_build_object('sub', demo_id::text, 'email', 'demo@exemplo.com', 'email_verified', true),
    now(), now(), now()
  );

  -- Plano pro: o seed tem 3 clientes (free permite 2).
  update public.workspaces
  set nome = 'Estúdio Demo', slug = 'estudio-demo', plano = 'pro'
  where owner_id = demo_id
  returning id into ws_id;

  update public.profiles set onboarded_at = now() where id = demo_id;
end;
$$;
