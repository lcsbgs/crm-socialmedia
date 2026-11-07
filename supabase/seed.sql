-- Seed de demonstração do Pauta (banco local). Login: demo@pauta.dev / demo123456
-- 1 estúdio (plano Estúdio), 2 pessoas, 10 clientes com cor, pacote, estratégia e kit,
-- cerca de 200 posts em etapas variadas (mês atual e seguinte), reuniões, aprovações,
-- cobranças, despesas, um lead com proposta e um relatório.
-- O trigger on_auth_user_created cria o perfil e o espaço pessoal.

do $$
declare
  demo_id uuid := '00000000-0000-4000-a000-000000000001';
  julia_id uuid := '00000000-0000-4000-a000-000000000002';
  ws_id uuid;
  pkg_id uuid := '00000000-0000-4000-b000-000000000001';
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  mes date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  nomes text[] := array['Padaria Pão Quente', 'Clínica Sorrir', 'Studio Lume', 'Forma Academia', 'Vino & Companhia',
                        'Café Bem-te-vi', 'Ótica Visão Clara', 'Pet Feliz', 'Doce Ateliê', 'Barbearia do Zé'];
  segmentos text[] := array['Padaria', 'Odontologia', 'Estética', 'Academia', 'Bebidas', 'Cafeteria', 'Ótica', 'Pet shop', 'Confeitaria', 'Barbearia'];
  temas text[] := array['Bastidores da semana', 'Dica rápida', 'Depoimento de cliente', 'Produto do mês', 'Antes e depois',
                        'Conheça a equipe', 'Promoção de sexta', 'Pergunta para você', 'Novidade chegando', 'Por que fazemos assim',
                        'Receita fácil', 'Mito ou verdade', 'Agenda da semana', 'Cliente da semana', 'Tendência do mês'];
  cid uuid;
  i int;
  d record;
  n int := 0;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values
    ('00000000-0000-0000-0000-000000000000', demo_id, 'authenticated', 'authenticated',
     'demo@pauta.dev', extensions.crypt('demo123456', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"nome":"Bia Martins"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', julia_id, 'authenticated', 'authenticated',
     'julia@pauta.dev', extensions.crypt('demo123456', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"nome":"Júlia Rocha"}', now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text, 'email',
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
  from auth.users u where u.id in (demo_id, julia_id);

  select id into ws_id from public.workspaces where owner_id = demo_id;
  update public.workspaces set plano = 'estudio', nome = 'Estúdio Bia Social', modo_trabalho = 'equipe' where id = ws_id;
  update public.profiles set onboarded_at = now(), resumo_diario = false where id in (demo_id, julia_id);
  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, julia_id, 'member');

  insert into public.package_templates (id, workspace_id, nome, itens, preco, limite_rodadas) values
    (pkg_id, ws_id, 'Essencial',
     '[{"tipo":"Post","quantidade":2,"cadencia":"semanal"},{"tipo":"Carrossel","quantidade":1,"cadencia":"semanal"},{"tipo":"Relatório","quantidade":1,"cadencia":"mensal"}]',
     1200, 2);

  -- Como owner, para os triggers de atribuição.
  perform set_config('request.jwt.claims', json_build_object('sub', demo_id, 'role', 'authenticated')::text, true);

  for i in 1..10 loop
    insert into public.clients (workspace_id, nome, segmento, package_template_id, valor_mensal, dia_vencimento, status, cor,
                                instagram_handle, contatos, tom_de_voz)
    values (ws_id, nomes[i], segmentos[i], pkg_id, 1000 + i * 100, 5 + i, 'ativo', i - 1,
            lower(regexp_replace(nomes[i], '[^A-Za-z]', '', 'g')),
            jsonb_build_array(jsonb_build_object('nome', 'Contato ' || i, 'cargo', 'aprova conteúdo', 'telefone', '5499999000' || (i % 10), 'email', 'contato' || i || '@exemplo.com')),
            'Próximo, bem-humorado e direto.')
    returning id into cid;
    if i <= 5 then
      insert into public.client_assignees (workspace_id, client_id, user_id) values (ws_id, cid, julia_id) on conflict do nothing;
    end if;
    insert into public.client_strategies (client_id, workspace_id, objetivo, pilares, formatos, decisoes)
    values (cid, ws_id, 'Vender mais pelo direct no trimestre',
            '[{"nome":"Produto","pct":40},{"nome":"Bastidores","pct":30},{"nome":"Educativo","pct":20},{"nome":"Prova social","pct":10}]',
            '[{"formato":"Carrossel","frequencia":"1 por semana"},{"formato":"Post","frequencia":"2 por semana"}]',
            jsonb_build_array(jsonb_build_object('data', to_char(hoje - 9, 'YYYY-MM-DD'), 'texto', 'Foco em pedidos de fim de ano', 'origem', 'reuniao')));
    insert into public.brand_kits (client_id, workspace_id, cores, tom, evitar)
    values (cid, ws_id, '[{"hex":"#F28C28","nome":"Laranja"},{"hex":"#1D2433","nome":"Grafite"}]', '{acolhedor,bem-humorado}', '{"promoção relâmpago"}');
  end loop;

  -- Posts do pacote: mês atual e seguinte.
  perform public.generate_month(ws_id, mes);
  perform public.generate_month(ws_id, (mes + interval '1 month')::date);

  -- Títulos, etapas e responsáveis variados.
  for d in select id, data_publicacao, row_number() over (order by data_publicacao, id) as rn from public.deliverables where workspace_id = ws_id loop
    n := n + 1;
    update public.deliverables set
      titulo = case when d.data_publicacao <= hoje + 14 then temas[1 + (d.rn % array_length(temas, 1))] else null end,
      legenda = case when d.data_publicacao <= hoje + 7 then 'Legenda de exemplo para o post. Conta a história e termina com uma chamada para o direct.' else null end,
      status = (case
        when d.data_publicacao < hoje - 2 then 'publicado'
        when d.data_publicacao < hoje then (case when d.rn % 5 = 0 then 'produzir' else 'publicado' end)
        when d.data_publicacao = hoje then 'agendado'
        when d.data_publicacao <= hoje + 3 then (case d.rn % 4 when 0 then 'em_aprovacao' when 1 then 'aprovado' when 2 then 'ajuste' else 'em_aprovacao' end)
        when d.data_publicacao <= hoje + 10 then 'produzir'
        else 'planejar' end)::public.deliverable_status,
      hora_publicacao = case when d.data_publicacao = hoje then make_time(9 + (d.rn % 10)::int, 0, 0) else null end,
      responsavel_id = case when d.rn % 3 = 0 then julia_id else demo_id end,
      pilar = (array['Produto', 'Bastidores', 'Educativo', 'Prova social'])[1 + (d.rn % 4)]
    where id = d.id;
  end loop;
  update public.deliverables set status_changed_at = now() - interval '2 days' where workspace_id = ws_id and status = 'em_aprovacao';

  -- Respostas do cliente.
  insert into public.approvals (workspace_id, deliverable_id, decisao, comentario, autor_nome, created_at)
  select ws_id, id, 'ajuste', 'Trocar a foto por uma mais clara', 'Contato', now() - interval '3 hours'
  from public.deliverables where workspace_id = ws_id and status = 'ajuste';
  insert into public.approvals (workspace_id, deliverable_id, decisao, autor_nome, created_at)
  select ws_id, id, 'aprovado', 'Contato', now() - interval '1 day'
  from public.deliverables where workspace_id = ws_id and status = 'aprovado';

  -- Reuniões de hoje e da semana.
  insert into public.meetings (workspace_id, client_id, titulo, data, duracao_min, meet_link)
  select ws_id, c.id,
         case when c.cor = 0 then 'Alinhamento do próximo mês' else 'Reunião mensal' end,
         (hoje + (c.cor % 5))::timestamp at time zone 'America/Sao_Paulo' + make_interval(hours => 10 + (c.cor % 6)),
         45, 'https://meet.google.com/demo-pauta'
  from public.clients c where c.workspace_id = ws_id and c.cor < 6;

  -- Tarefas.
  insert into public.tasks (workspace_id, client_id, titulo, due_date, origem, responsavel_id)
  select ws_id, c.id, 'Enviar fotos novas da vitrine', hoje, 'ata', demo_id from public.clients c where c.workspace_id = ws_id and c.cor = 0;
  insert into public.tasks (workspace_id, client_id, titulo, due_date, origem, responsavel_id)
  select ws_id, c.id, 'Revisar relatório do mês passado', hoje - 1, 'manual', julia_id from public.clients c where c.workspace_id = ws_id and c.cor = 3;

  -- Cobranças: o generate_month criou as do mês; algumas pagas e uma atrasada.
  update public.payments set status = 'pago', pago_em = hoje - 2, metodo = 'pix'
  where workspace_id = ws_id and competencia = mes and client_id in (select id from public.clients where workspace_id = ws_id and cor in (0, 1, 2));
  update public.payments set vencimento = least(vencimento, hoje - 5), status = 'atrasado'
  where workspace_id = ws_id and competencia = mes and client_id in (select id from public.clients where workspace_id = ws_id and cor = 2) and status <> 'pago';
  insert into public.expenses (workspace_id, descricao, categoria, valor, data) values
    (ws_id, 'Freelancer de vídeo', 'freelancer', 400, hoje - 4),
    (ws_id, 'Imposto (DAS)', 'impostos', 320, hoje - 6),
    (ws_id, 'Ferramentas', 'ferramentas', 140, hoje - 10);

  -- Escopo extra a cobrar.
  insert into public.scope_requests (workspace_id, client_id, descricao, valor_sugerido)
  select ws_id, id, '1 reels extra', 150 from public.clients where workspace_id = ws_id and cor = 0;

  -- Comercial.
  insert into public.leads (id, workspace_id, nome, contato_nome, telefone, etapa, valor_estimado)
  values ('00000000-0000-4000-c000-000000000001', ws_id, 'Floricultura Primavera', 'Rosa', '54999990011', 'proposta', 1500);
  insert into public.proposals (workspace_id, lead_id, titulo, package_template_id, valor_mensal, status, enviada_em, validade)
  values (ws_id, '00000000-0000-4000-c000-000000000001', 'Proposta para Floricultura Primavera', pkg_id, 1500, 'enviada', now() - interval '1 day', hoje + 10);

  perform set_config('request.jwt.claims', '', true);
  raise notice 'Seed: % posts no espaço %', n, ws_id;
end;
$$;
