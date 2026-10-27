-- Comentários da equipe e histórico de cada entrega.

create table public.deliverable_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  deliverable_id uuid not null,
  author_id uuid references public.profiles (id) on delete set null,
  corpo text not null check (char_length(trim(corpo)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (deliverable_id, workspace_id)
    references public.deliverables (id, workspace_id) on delete cascade
);

create index deliverable_comments_deliverable_idx on public.deliverable_comments (deliverable_id, created_at);
create index deliverable_comments_workspace_idx on public.deliverable_comments (workspace_id);

create trigger deliverable_comments_updated_at before update on public.deliverable_comments
  for each row execute function public.set_updated_at();

alter table public.deliverable_comments enable row level security;

create policy "deliverable_comments: membros leem" on public.deliverable_comments
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

create policy "deliverable_comments: membros comentam como si" on public.deliverable_comments
  for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_workspace_member(workspace_id)));

create policy "deliverable_comments: autor apaga" on public.deliverable_comments
  for delete to authenticated
  using (author_id = (select auth.uid()) and (select public.is_workspace_member(workspace_id)));

revoke all on public.deliverable_comments from anon, authenticated;
grant select, insert, delete on public.deliverable_comments to authenticated;

-- Histórico: escrito só pelo trigger.
create table public.deliverable_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  deliverable_id uuid not null,
  actor_id uuid references public.profiles (id) on delete set null,
  tipo text not null check (tipo in ('criada', 'status', 'data', 'titulo', 'responsavel')),
  de text,
  para text,
  created_at timestamptz not null default now(),
  foreign key (deliverable_id, workspace_id)
    references public.deliverables (id, workspace_id) on delete cascade
);

create index deliverable_activity_deliverable_idx on public.deliverable_activity (deliverable_id, created_at);
create index deliverable_activity_workspace_idx on public.deliverable_activity (workspace_id);

alter table public.deliverable_activity enable row level security;

create policy "deliverable_activity: membros leem" on public.deliverable_activity
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

revoke all on public.deliverable_activity from anon, authenticated;
grant select on public.deliverable_activity to authenticated;

create or replace function public.log_deliverable_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    -- Slots gerados pelo pacote não poluem o histórico.
    if new.slot_key is null then
      insert into public.deliverable_activity (workspace_id, deliverable_id, actor_id, tipo, para)
      values (new.workspace_id, new.id, actor, 'criada', new.status::text);
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.deliverable_activity (workspace_id, deliverable_id, actor_id, tipo, de, para)
    values (new.workspace_id, new.id, actor, 'status', old.status::text, new.status::text);
  end if;
  if new.data_publicacao is distinct from old.data_publicacao then
    insert into public.deliverable_activity (workspace_id, deliverable_id, actor_id, tipo, de, para)
    values (new.workspace_id, new.id, actor, 'data', old.data_publicacao::text, new.data_publicacao::text);
  end if;
  if new.titulo is distinct from old.titulo then
    insert into public.deliverable_activity (workspace_id, deliverable_id, actor_id, tipo, de, para)
    values (new.workspace_id, new.id, actor, 'titulo', old.titulo, new.titulo);
  end if;
  if new.responsavel_id is distinct from old.responsavel_id then
    insert into public.deliverable_activity (workspace_id, deliverable_id, actor_id, tipo, de, para)
    values (new.workspace_id, new.id, actor, 'responsavel', old.responsavel_id::text, new.responsavel_id::text);
  end if;
  return new;
end;
$$;

revoke execute on function public.log_deliverable_activity() from public, anon, authenticated;

create trigger deliverables_log_activity
  after insert or update of status, data_publicacao, titulo, responsavel_id on public.deliverables
  for each row execute function public.log_deliverable_activity();
