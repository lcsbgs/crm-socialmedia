# Revisão do app na Meta

Para publicar em contas de clientes (não só nas suas de teste), o app da Meta precisa de **Acesso Avançado** às permissões abaixo, aprovado na Revisão do app. Antes disso, só funciona com contas que têm papel no app (administrador, desenvolvedor ou testador).

## Pré-requisitos
- App do tipo **Empresa**, com Verificação da empresa concluída (Configurações do Business Manager).
- Política de privacidade e Termos de uso publicados (URL pública).
- URL de exclusão de dados: `https://SEU_DOMINIO/ajuda/excluir-dados` (página explicando como pedir; o Pauta apaga ao excluir o espaço).
- Ícone do app (1024x1024) e categoria "Negócios e páginas".
- Login de teste para o revisor: um espaço do Pauta com um cliente de exemplo e a conta de teste da Meta ligada.

## Permissões e justificativas

| Permissão | Para que o Pauta usa | Justificativa para o formulário |
|---|---|---|
| `pages_show_list` | Listar as páginas que a pessoa administra para ela escolher a do cliente | "O Pauta mostra as páginas que a pessoa administra para ela ligar cada página ao cliente correto antes de agendar publicações." |
| `pages_read_engagement` | Ler dados básicos e o Instagram ligado à página | "Usamos para identificar a conta do Instagram ligada à página e exibir o nome e a foto no seletor de contas." |
| `pages_manage_posts` | Publicar posts agendados na página do cliente | "A agência agenda um post aprovado pelo cliente e o Pauta publica na página no horário escolhido. Nada é publicado sem uma ação explícita de agendamento." |
| `instagram_basic` | Ler o perfil profissional (nome de usuário, foto) | "Exibimos o @ da conta no seletor e na pré-visualização do post." |
| `instagram_content_publish` | Publicar imagem, carrossel, reels e stories | "Publicação agendada de conteúdo aprovado pelo cliente final no portal de aprovação do Pauta." |
| `instagram_manage_insights` | Métricas para o relatório mensal | "O Pauta gera o relatório mensal do cliente com alcance e interações das publicações." |
| `business_management` | Acessar ativos que o cliente compartilhou com a agência no Business Manager | "Agências recebem acesso às páginas dos clientes como parceiras no Business Manager; precisamos disso para listar esses ativos." |

Para o **Business Login for Instagram** (contas sem página): `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights`, com as mesmas justificativas.

## Roteiro do vídeo (screencast, até 5 minutos)

Grave com narração ou legendas em inglês (a revisão é em inglês), mostrando o app em produção ou em ambiente de teste com HTTPS:

1. **Login no Pauta** com e-mail (mostre a tela de login).
2. **Conectar a Meta**: Ajustes > Integrações > "Facebook e Instagram" > Conectar. Mostre a tela de consentimento da Meta com todas as permissões e clique em continuar.
3. **Escolher a conta do cliente**: abra um cliente > Arquivos > "Onde publica" e marque a página e o Instagram dele. Explique que cada cliente só usa as contas ligadas a ele.
4. **Criar o post**: Produção > Novo post, envie a arte, escreva a legenda.
5. **Aprovação do cliente**: envie para aprovação e mostre o portal no celular aprovando (deixa claro que a publicação é de conteúdo aprovado).
6. **Agendar**: no editor do post, seção Publicação, escolha as contas e o horário, clique em "Agendar publicação".
7. **Publicado**: mostre o post aparecendo no Instagram e na página (pode agendar para 2 minutos depois) e o status "no ar" no Pauta, com o link "Ver no ar".
8. **Métricas**: abra o relatório do cliente mostrando os dados de insights.
9. **Desconectar**: Ajustes > Integrações > Desconectar, mostrando que o acesso é removido.

## Depois da aprovação
- Troque o app para o modo **Ao vivo**.
- Configure `META_APP_ID`, `META_APP_SECRET`, `META_CONFIG_ID` e `INTEGRATIONS_MODE=real` (ver `docs/oauth-setup.md`).
- Agende a fila de publicação a cada minuto e a renovação de tokens diária (`docs/beta-checklist.md`).
