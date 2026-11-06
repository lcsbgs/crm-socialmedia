# Pauta

Sistema de gestão e publicação para social medias e pequenas agências. Este repositório (crm-socialmedia) já tem uma primeira versão em Next.js + TypeScript + Tailwind conectada ao Supabase.

## Fontes da verdade
- docs/spec.md: especificação funcional completa (o que cada módulo faz, modelo de dados, integrações, planos, fases).
- docs/design/: telas aprovadas e tokens (leia docs/design/README.md primeiro).
- docs/gaps.md: auditoria do que existe e do que falta (criada no primeiro prompt, atualizada a cada etapa).

## Regras de trabalho
- Evoluir o que existe; não recomeçar o projeto nem apagar dados.
- Toda mudança de banco é migração nova em supabase/migrations, com RLS por membresia de workspace em toda tabela de negócio.
- Links públicos (portal do cliente, proposta, briefing, convite) usam token e passam pelo servidor; nunca liberar acesso anônimo direto ao banco.
- Segredos e tokens de terceiros só no servidor, criptografados no banco.
- Textos da interface em português do Brasil, sem travessão (em-dash). Usar vírgula, dois-pontos ou ponto.
- Interface segue docs/design/README.md: tokens em tailwind.config, componentes reutilizáveis em src/components/ui.
- Integrações externas atrás de interfaces (adapters) para trocar provedor sem mexer na tela: IA (Anthropic e OpenAI via ChatGPT), cobrança (manual e Asaas), publicação (Meta).
- Ao final de cada etapa: rodar typecheck, lint e build; atualizar docs/gaps.md; fazer commit com mensagem clara.
- Na dúvida sobre regra de negócio, seguir docs/spec.md; se a spec não cobrir, perguntar antes de inventar.
