-- Pauta, Fase 9: reuniões ligadas ao Google Agenda (com Meet) e ao Granola; brief 15 minutos antes.

alter table public.meetings
  add column if not exists duracao_min integer not null default 45 check (duracao_min between 5 and 480),
  add column if not exists origem text not null default 'manual' check (origem in ('manual', 'google')),
  add column if not exists google_event_id text,
  add column if not exists meet_link text,
  add column if not exists granola_note_id text,
  add column if not exists brief_avisado_em timestamptz;
create unique index if not exists meetings_google_event_idx on public.meetings (workspace_id, google_event_id) where google_event_id is not null;

-- Aviso do brief para quem cuida do cliente, 15 minutos antes da reunião. Job a cada 5 minutos.
create or replace function public.run_meeting_briefs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  with alvo as (
    update public.meetings m
    set brief_avisado_em = now()
    from public.clients c
    where c.id = m.client_id
      and m.brief_avisado_em is null
      and m.data between now() and now() + interval '15 minutes'
    returning m.id, m.workspace_id, m.client_id, m.titulo, m.data, c.nome as cliente
  ),
  avisos as (
    insert into public.notifications (workspace_id, user_id, tipo, titulo, corpo)
    select a.workspace_id, ca.user_id, 'sistema',
           format('Reunião com %s às %s', a.cliente, to_char(a.data at time zone 'America/Sao_Paulo', 'HH24:MI')),
           format('O brief de "%s" está pronto.', a.titulo)
    from alvo a
    join public.client_assignees ca on ca.client_id = a.client_id
    returning 1
  )
  select count(*) into n from alvo;
  return n;
end;
$$;
revoke execute on function public.run_meeting_briefs() from public, anon, authenticated;
grant execute on function public.run_meeting_briefs() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'pauta-briefs';
    perform cron.schedule('pauta-briefs', '*/5 * * * *', 'select public.run_meeting_briefs()');
  end if;
exception when others then
  raise notice 'pg_cron indisponível: agende run_meeting_briefs() manualmente (%).', sqlerrm;
end;
$$;
