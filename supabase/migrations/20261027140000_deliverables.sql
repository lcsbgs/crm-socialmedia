-- Entregas (kanban por cliente) e mídia no Storage.

create type public.deliverable_format as enum ('post', 'reels', 'carrossel', 'story', 'relatorio');
create type public.deliverable_status as enum ('planejar', 'produzir', 'em_aprovacao', 'aprovado', 'publicado');

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  titulo text not null check (char_length(trim(titulo)) between 1 and 200),
  formato public.deliverable_format not null default 'post',
  data_publicacao date,
  legenda text,
  -- Caminhos no bucket "midia" ({workspace_id}/{client_id}/{deliverable_id}/arquivo).
  -- O bucket é privado: a UI gera URLs assinadas na leitura.
  midia_urls text[] not null default '{}',
  status public.deliverable_status not null default 'planejar',
  -- Posição dentro da coluna (fracionária, para reordenar sem renumerar).
  ordem double precision not null default 0,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (client_id, workspace_id)
    references public.clients (id, workspace_id) on delete cascade
);

create index deliverables_workspace_id_idx on public.deliverables (workspace_id);
create index deliverables_client_id_idx on public.deliverables (client_id);
create index deliverables_workspace_status_idx on public.deliverables (workspace_id, status, status_changed_at);

create trigger deliverables_updated_at before update on public.deliverables
  for each row execute function public.set_updated_at();

create or replace function public.set_deliverable_status_changed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger deliverables_status_changed before update of status on public.deliverables
  for each row execute function public.set_deliverable_status_changed_at();

alter table public.deliverables enable row level security;

create policy "deliverables: membros" on public.deliverables
  for all to authenticated
  using ((select public.is_workspace_member(workspace_id)))
  with check ((select public.is_workspace_member(workspace_id)));

revoke all on public.deliverables from anon, authenticated;
grant select, insert, update, delete on public.deliverables to authenticated;

-- ============================================================
-- Storage: bucket privado, primeira pasta do caminho = workspace_id
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'midia', 'midia', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf']
)
on conflict (id) do nothing;

-- true se o usuário é membro do workspace da primeira pasta do caminho.
create or replace function public.can_access_media(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pasta text := split_part(p_name, '/', 1);
begin
  if pasta !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_workspace_member(pasta::uuid);
end;
$$;

revoke execute on function public.can_access_media(text) from public, anon;
grant execute on function public.can_access_media(text) to authenticated;

create policy "midia: membros leem" on storage.objects
  for select to authenticated
  using (bucket_id = 'midia' and public.can_access_media(name));

create policy "midia: membros enviam" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'midia' and public.can_access_media(name));

create policy "midia: membros atualizam" on storage.objects
  for update to authenticated
  using (bucket_id = 'midia' and public.can_access_media(name))
  with check (bucket_id = 'midia' and public.can_access_media(name));

create policy "midia: membros removem" on storage.objects
  for delete to authenticated
  using (bucket_id = 'midia' and public.can_access_media(name));

-- ============================================================
-- Linha do tempo: entregas
-- ============================================================

create or replace view public.client_timeline
with (security_invoker = true)
as
select c.workspace_id, c.id as client_id, c.created_at as ocorreu_em,
       'cliente_criado'::text as tipo, 'Cliente cadastrado'::text as titulo, c.id as ref_id
from public.clients c

union all
select c.workspace_id, c.id, c.inicio_contrato::timestamp at time zone 'America/Sao_Paulo',
       'contrato_inicio', 'Início do contrato', c.id
from public.clients c
where c.inicio_contrato is not null

union all
select t.workspace_id, t.client_id, t.done_at,
       'tarefa_feita', 'Tarefa concluída: ' || t.titulo, t.id
from public.tasks t
where t.client_id is not null and t.done_at is not null

union all
select p.workspace_id, p.client_id, p.created_at,
       'cobranca_gerada', 'Cobrança gerada: ' || to_char(p.competencia, 'MM/YYYY'), p.id
from public.payments p

union all
select p.workspace_id, p.client_id, p.pago_em::timestamp at time zone 'America/Sao_Paulo',
       'pagamento_recebido', 'Pagamento recebido: ' || to_char(p.competencia, 'MM/YYYY'), p.id
from public.payments p
where p.pago_em is not null

union all
select d.workspace_id, d.client_id, d.created_at,
       'entrega_criada', 'Entrega criada: ' || d.titulo, d.id
from public.deliverables d

union all
select d.workspace_id, d.client_id, d.status_changed_at,
       'entrega_' || d.status::text,
       case d.status
         when 'em_aprovacao' then 'Enviada para aprovação: '
         when 'aprovado' then 'Entrega aprovada: '
         else 'Entrega publicada: '
       end || d.titulo,
       d.id
from public.deliverables d
where d.status in ('em_aprovacao', 'aprovado', 'publicado');
