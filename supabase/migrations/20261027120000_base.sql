-- Base: extensões, tipos e utilitários compartilhados.

create extension if not exists unaccent with schema extensions;

create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.plan_tier as enum ('free', 'pro', 'estudio');

-- Mantém updated_at em dia. Usada por todas as tabelas.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- "Estúdio Ana & Cia" -> "estudio-ana-cia"
create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent(coalesce(value, ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;
