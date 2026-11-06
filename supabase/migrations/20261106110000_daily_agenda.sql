-- Pauta, Fase 3: Em pauta hoje.
-- Tarefas ganham responsável (para "Minha pauta" x "Pauta do time");
-- posts ganham hora de publicação (lista "Publicações" do dia).

alter table public.tasks
  add column if not exists responsavel_id uuid references public.profiles (id) on delete set null;
create index if not exists tasks_responsavel_idx on public.tasks (workspace_id, responsavel_id);
create index if not exists tasks_done_at_idx on public.tasks (workspace_id, done_at);

-- Mesma regra dos posts: responsável precisa ser membro do espaço.
create trigger tasks_check_responsavel
  before insert or update of responsavel_id on public.tasks
  for each row execute function public.check_deliverable_responsavel();

alter table public.deliverables
  add column if not exists hora_publicacao time;
