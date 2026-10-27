-- Seed local. Login: demo@exemplo.com / demo123456
-- 1 usuário, 1 workspace (Pro), 1 pacote, 3 clientes e o mês atual gerado.
-- O trigger on_auth_user_created cria o perfil e o workspace pessoal.

do $$
declare
  demo_id uuid := '00000000-0000-4000-a000-000000000001';
  ws_id uuid;
  pkg_id uuid := '00000000-0000-4000-b000-000000000001';
  padaria_id uuid := '00000000-0000-4000-a000-0000000000c1';
  studio_id uuid := '00000000-0000-4000-a000-0000000000c2';
  clinica_id uuid := '00000000-0000-4000-a000-0000000000c3';
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
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

  insert into public.package_templates (id, workspace_id, nome, itens) values (
    pkg_id, ws_id, 'Essencial',
    '[{"tipo":"Post","quantidade":3,"cadencia":"semanal"},
      {"tipo":"Reels","quantidade":1,"cadencia":"semanal"},
      {"tipo":"Stories","quantidade":1,"cadencia":"diaria"},
      {"tipo":"Relatório","quantidade":1,"cadencia":"mensal"}]'
  );

  insert into public.clients (
    id, workspace_id, nome, segmento, briefing, tom_de_voz, contatos, links,
    package_template_id, valor_mensal, dia_vencimento, status, inicio_contrato
  ) values
  (
    padaria_id, ws_id, 'Padaria Pão Quente', 'Alimentação',
    'Padaria de bairro com 20 anos. Quer atrair público jovem para o café da manhã.',
    'Acolhedor, bem-humorado, com cara de vizinho.',
    '[{"nome":"Marcos","cargo":"Dono","telefone":"11999990001","email":"marcos@paoquente.com.br"}]',
    '[{"label":"Instagram","url":"https://instagram.com/paoquente"}]',
    pkg_id, 1200, 10, 'ativo', date_trunc('month', current_date)::date - interval '3 months'
  ),
  (
    studio_id, ws_id, 'Studio Corpo Livre', 'Academia',
    'Estúdio de pilates focado em mulheres 35+.',
    'Inspirador e próximo, sem jargão fitness.',
    '[{"nome":"Juliana","cargo":"Sócia","telefone":"11999990002","email":"ju@corpolivre.com.br"}]',
    '[{"label":"Instagram","url":"https://instagram.com/corpolivre"},{"label":"Site","url":"https://corpolivre.com.br"}]',
    pkg_id, 1800, 5, 'ativo', date_trunc('month', current_date)::date - interval '1 month'
  ),
  (
    clinica_id, ws_id, 'Clínica Sorriso', 'Saúde',
    'Clínica odontológica. Contrato pausado durante reforma.',
    'Profissional e tranquilizador.',
    '[{"nome":"Dr. Paulo","cargo":"Diretor","telefone":"11999990003"}]',
    '[]',
    pkg_id, 2500, 15, 'pausado', date_trunc('month', current_date)::date - interval '6 months'
  );

  perform public.generate_month(ws_id, hoje);

  -- Rotina em dia até anteontem; o que venceu ontem fica atrasado de propósito.
  update public.tasks set status = 'feita' where workspace_id = ws_id and due_date < hoje - 1;

  insert into public.deliverables (workspace_id, client_id, titulo, formato, data_publicacao, legenda, status, ordem) values
    (ws_id, padaria_id, 'Pão de queijo saindo do forno', 'reels', hoje + 2, 'O cheirinho que acorda o bairro.', 'produzir', 1),
    (ws_id, padaria_id, 'Promoção café + pão na chapa', 'post', hoje + 1, 'Café da manhã completo por R$ 12. Só até sexta!', 'em_aprovacao', 1),
    (ws_id, padaria_id, 'Bastidores da fornada', 'story', hoje + 4, null, 'planejar', 1),
    (ws_id, padaria_id, 'Cardápio de outono', 'carrossel', hoje - 3, 'Seis novidades para os dias frios.', 'publicado', 1),
    (ws_id, studio_id, 'Três exercícios para a lombar', 'carrossel', hoje + 3, 'Salve para fazer em casa.', 'em_aprovacao', 1),
    (ws_id, studio_id, 'Depoimento da aluna Marta', 'reels', hoje + 6, null, 'planejar', 1),
    (ws_id, studio_id, 'Relatório mensal', 'relatorio', hoje + 5, null, 'aprovado', 1);

  -- Uma entrega parada em aprovação há 4 dias (aparece na tela Hoje).
  update public.deliverables set status_changed_at = now() - interval '4 days'
  where client_id = studio_id and status = 'em_aprovacao';
end;
$$;
