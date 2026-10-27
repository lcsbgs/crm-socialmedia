-- Cor do cliente: índice (0 a 9) de uma paleta fixa definida na aplicação
-- (src/config/client-colors.ts). Usada em avatar e etiqueta.

alter table public.clients
  add column cor smallint check (cor between 0 and 9);

-- Novos clientes recebem a próxima cor em rodízio dentro do workspace.
create or replace function public.set_client_color()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cor is null then
    select (count(*) % 10)::smallint into new.cor
    from public.clients c
    where c.workspace_id = new.workspace_id;
  end if;
  return new;
end;
$$;

create trigger clients_set_color before insert on public.clients
  for each row execute function public.set_client_color();

-- Clientes existentes: rodízio por ordem de criação.
update public.clients c
set cor = sub.idx
from (
  select id, ((row_number() over (partition by workspace_id order by created_at, id) - 1) % 10)::smallint as idx
  from public.clients
) sub
where sub.id = c.id;

-- Sem NOT NULL: o trigger sempre preenche, e assim o campo não vira obrigatório nos inserts da API.
