-- Seed local. Login: demo@exemplo.com / demo123456
-- 1 usuário, 1 workspace (Pro), 1 pacote, 3 clientes, o mês atual gerado
-- com entregas de títulos realistas, tarefas operacionais e uma reunião.
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
  d record;
  titulos_padaria text[] := array[
    'Bom dia com pão na chapa', 'Bastidores da fornada das 5h', 'Café + pão de queijo por R$ 9',
    'Conheça a dona Lurdes, nossa confeiteira', 'Enquete: doce ou salgado no café?', 'Receita de rosca de coco',
    'Cardápio de outono chegou', 'Pão australiano saindo agora', 'Promoção de quinta: 2 cafés por 1',
    'Como nasce um croissant', 'Cliente da semana: seu Antônio', 'Kit café da manhã para presente',
    'Bolo de fubá da vó', 'Por que nosso pão leva 24 horas', 'Agenda de encomendas de fim de ano',
    'Sexta do sonho recheado'
  ];
  titulos_studio text[] := array[
    'Três exercícios para a lombar', 'Mitos do pilates depois dos 40', 'Depoimento da aluna Marta',
    'Postura no home office', 'Aula experimental grátis em novembro', 'Respiração que alivia a ansiedade',
    'Por dentro do studio', 'Alongamento de 5 minutos para começar o dia', 'Pilates para quem tem joelho sensível',
    'Conheça a professora Bia', 'Desafio de novembro: 12 aulas', 'Antes e depois: 6 meses de pilates',
    'Para que serve o reformer', 'Dica de sono melhor', 'Turmas novas de sábado', 'Café com as alunas'
  ];
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
    '[{"tipo":"Post","quantidade":2,"cadencia":"semanal"},
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
    pkg_id, 1200, 10, 'ativo', date_trunc('month', hoje)::date - interval '3 months'
  ),
  (
    studio_id, ws_id, 'Studio Corpo Livre', 'Academia',
    'Estúdio de pilates focado em mulheres 35+.',
    'Inspirador e próximo, sem jargão fitness.',
    '[{"nome":"Juliana","cargo":"Sócia","telefone":"11999990002","email":"ju@corpolivre.com.br"}]',
    '[{"label":"Instagram","url":"https://instagram.com/corpolivre"},{"label":"Site","url":"https://corpolivre.com.br"}]',
    pkg_id, 1800, 5, 'ativo', date_trunc('month', hoje)::date - interval '1 month'
  ),
  (
    clinica_id, ws_id, 'Clínica Sorriso', 'Saúde',
    'Clínica odontológica. Contrato pausado durante reforma.',
    'Profissional e tranquilizador.',
    '[{"nome":"Dr. Paulo","cargo":"Diretor","telefone":"11999990003"}]',
    '[]',
    pkg_id, 2500, 15, 'pausado', date_trunc('month', hoje)::date - interval '6 months'
  );

  perform public.generate_month(ws_id, hoje);
  perform public.generate_month(ws_id, (date_trunc('month', hoje) + interval '1 month')::date);

  -- Títulos e etapas realistas: o que já passou foi publicado, a semana corrente
  -- está em produção ou aprovação e o resto do mês segue como rascunho.
  for d in
    select id, client_id, data_publicacao, slot_label, formato,
           row_number() over (partition by client_id order by data_publicacao, ordem) as n
    from public.deliverables
    where workspace_id = ws_id and slot_key is not null and formato in ('post', 'reels', 'carrossel')
  loop
    update public.deliverables set
      titulo = case when d.data_publicacao <= hoje + 6 then
        case when d.client_id = padaria_id
          then titulos_padaria[1 + (d.n - 1) % array_length(titulos_padaria, 1)]
          else titulos_studio[1 + (d.n - 1) % array_length(titulos_studio, 1)]
        end
      end,
      legenda = case when d.data_publicacao between hoje - 1 and hoje + 3
        then 'Legenda em rascunho. Ajustar o tom e a chamada antes de publicar.' end
    where id = d.id;
  end loop;

  update public.deliverables set status = case
      when data_publicacao < hoje - 1 then 'publicado'
      when data_publicacao <= hoje + 1 then 'em_aprovacao'
      when data_publicacao <= hoje + 4 then 'produzir'
      else 'planejar'
    end::public.deliverable_status
  where workspace_id = ws_id and titulo is not null;

  update public.deliverables set titulo = 'Bastidores da semana', status = 'publicado'
  where workspace_id = ws_id and formato = 'story' and data_publicacao < hoje - 1;

  update public.deliverables set titulo = 'Relatório de ' || to_char(competencia, 'MM/YYYY'),
    status = case when competencia = date_trunc('month', hoje)::date then 'produzir' else 'planejar' end::public.deliverable_status
  where workspace_id = ws_id and formato = 'relatorio';

  -- Uma aprovação parada há 4 dias (aparece em "Esperando o cliente").
  update public.deliverables set status_changed_at = now() - interval '4 days'
  where id = (
    select id from public.deliverables
    where client_id = studio_id and status = 'em_aprovacao'
    order by data_publicacao limit 1
  );

  -- Tarefas operacionais (não são entregas).
  insert into public.tasks (workspace_id, client_id, titulo, tipo, due_date, origem) values
    (ws_id, padaria_id, 'Cobrar fotos novas do balcão', 'avulsa', hoje - 2, 'manual'),
    (ws_id, padaria_id, 'Enviar relatório do mês passado', 'avulsa', hoje, 'manual'),
    (ws_id, studio_id, 'Pedir depoimentos de alunas para o carrossel', 'avulsa', hoje - 1, 'manual'),
    (ws_id, studio_id, 'Confirmar horário da gravação no studio', 'avulsa', hoje, 'manual'),
    (ws_id, null, 'Atualizar portfólio com os cases do mês', 'avulsa', hoje + 3, 'manual'),
    (ws_id, clinica_id, 'Ligar para o Dr. Paulo sobre a volta do contrato', 'avulsa', hoje + 5, 'manual');

  -- Ajustes do seed não entram no histórico das entregas.
  delete from public.deliverable_activity where workspace_id = ws_id;

  insert into public.meetings (workspace_id, client_id, titulo, data, notas_brutas) values
    (ws_id, studio_id, 'Planejamento do próximo mês',
     (hoje::timestamp + interval '15 hours') at time zone 'America/Sao_Paulo',
     'Ju quer reforçar a aula experimental. Pensar em série de vídeos curtos com a professora Bia.');
end;
$$;
