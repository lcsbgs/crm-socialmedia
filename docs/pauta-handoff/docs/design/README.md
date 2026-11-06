# Pauta: referências de design

Estes arquivos são as telas aprovadas, exportadas do canvas de design. São referência visual e de conteúdo, não código para copiar. Eles usam estilos inline e uma marcação própria do editor de design (`<x-dc>`, `<helmet>`, `<sc-for>`, `<sc-if>`, `{{ }}`, classe `DCLogic`). Ignore essa marcação e reproduza o resultado em React + Tailwind.

## Mapa de telas

| Arquivo | Tela | Rota sugerida |
| --- | --- | --- |
| Login.dc.html | Entrar ou criar conta (ChatGPT, Google, Apple, e-mail) | /login |
| OnbEspaco.dc.html | Onboarding 1: nome do estúdio, modo de trabalho, convites | /onboarding/espaco |
| OnbIA.dc.html | Onboarding 2: usar plano do ChatGPT ou créditos do Pauta | /onboarding/ia |
| OnbCliente.dc.html | Onboarding 3: primeiro cliente, pacote, responsáveis, contas Meta | /onboarding/cliente |
| Convite.dc.html | Convite aceito por nova pessoa da equipe | /convite/[token] |
| Main.dc.html | Em pauta hoje (tela inicial) | /w/[slug] |
| Cliente.dc.html | Página do cliente, aba Visão geral | /w/[slug]/clientes/[id] |
| Calendario.dc.html | Calendário editorial do mês | /w/[slug]/calendario |
| Producao.dc.html | Kanban de produção com editor do post aberto | /w/[slug]/producao |
| Financeiro.dc.html | Financeiro: cobranças, NFS-e, despesas, contador | /w/[slug]/financeiro |
| Equipe.dc.html | Ajustes > Equipe | /w/[slug]/ajustes/equipe |
| Aprovacao.dc.html | Portal do cliente no celular (sem login) | /p/[token] |

## Tokens

Cores
- Fundo da aplicação: #F4F5F7
- Superfície (cards, sidebar): #FFFFFF
- Texto: #1D2433; texto secundário: #3E4656; texto apagado: #5E6675
- Borda: #E3E6EC; borda de input: #D5D9E2; borda tracejada: #C9CEDA
- Primária (ação principal): #6B4EFF; primária tonal: #EEEAFF; texto sobre tonal: #3B23B8
- Destaque "hoje": #FFC93C; tonal #FFF6D6; texto #5A3D00 / #6B4A00
- Sucesso: #1F7A4D; tonal #DDF3E8; texto #135E3A
- Atenção/atraso: #C2410C; tonal #FFE9D6 / #FFF1E6; texto #8A3A06
- Botão escuro: #1D2433 (ações secundárias fortes); ChatGPT: #0D0D0D

Cor por cliente (escolhida no cadastro, usada em etiqueta, avatar, calendário e kanban)
- Laranja #F28C28 (tonal #FFF1E6, texto #8A3A06)
- Verde-água #1C8C86 (tonal #E2F4F2, texto #0F5C58)
- Rosa #D9468F (tonal #FCE3F0, texto #9C1F5E)
- Azul #3D6FE0 (tonal #E4ECFC, texto #1F4BAF)
- Roxo #7A4FD6 (tonal #EFE8FB, texto #5A2FB0)
- Adicionar mais 5 a 7 cores no mesmo padrão (cor forte, tonal clara, texto escuro com contraste AA)

Tipografia
- Títulos: Bricolage Grotesque 700 (H1 36 a 44px, letter-spacing -0.02em; H2 de card 20 a 22px)
- Texto: Figtree 400/500/600/700, base 14 a 15px, legendas 12 a 13px
- Números em tabelas: font-variant-numeric: tabular-nums

Forma e espaço
- Raio: cards de seção 24px; cards internos e inputs 14 a 16px; etiquetas 6px; botões e chips 999px (pílula)
- Botões: 44 a 52px de altura na ação principal, 36px nas ações de linha
- Sidebar 220 a 280px; conteúdo com padding 28 a 40px; gaps de 12, 14, 20 e 28px
- Sombras: nenhuma; separação por cor de fundo e borda

Princípios visuais
- Base calma (Notion), cor por cliente e kanban (Trello), violeta e pílulas (Canva), ação principal destacada por cor e tamanho (Material 3 Expressive).
- Toda informação tem a ação ao lado.
- Saudação variável no topo da tela inicial ("Olá, Bia!", "Bom dia, Bia. Café na mão?", "Bia, a Padaria aprovou 2 posts ontem."), sorteada por visita, às vezes com um fato do dia.
- Logos de ChatGPT, Google, Apple e Meta: usar os botões e marcas oficiais de cada provedor, seguindo as regras deles. No design estão como formas neutras.
