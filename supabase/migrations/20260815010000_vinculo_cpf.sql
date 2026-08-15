-- O CPF é a identidade de negócio que associa a conta ao cadastro do cliente.
alter table public.usuarios
  add column if not exists cpf text;

alter table public.clientes
  add column if not exists cpf text;

update public.usuarios
set cpf = regexp_replace(cpf, '\D', '', 'g')
where cpf is not null;

update public.clientes
set cpf = regexp_replace(cpf, '\D', '', 'g')
where cpf is not null;

create index if not exists usuarios_cpf_idx
  on public.usuarios (cpf)
  where cpf is not null and cpf <> '';

create index if not exists clientes_cpf_idx
  on public.clientes (cpf)
  where cpf is not null and cpf <> '';

create or replace function public.assimilar_conta_cliente_por_cpf()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cpf_limpo text;
  cliente_encontrado uuid;
begin
  cpf_limpo := regexp_replace(coalesce(new.cpf, ''), '\D', '', 'g');
  new.cpf := nullif(cpf_limpo, '');

  if length(cpf_limpo) <> 11 then
    return new;
  end if;

  if tg_table_name = 'usuarios' then
    select id into cliente_encontrado
    from public.clientes
    where cpf = cpf_limpo
    order by id
    limit 1;

    if cliente_encontrado is not null then
      new.cliente_id := cliente_encontrado;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists usuarios_assimilar_cpf on public.usuarios;
create trigger usuarios_assimilar_cpf
before insert or update of cpf on public.usuarios
for each row execute function public.assimilar_conta_cliente_por_cpf();

drop trigger if exists clientes_normalizar_cpf on public.clientes;
create trigger clientes_normalizar_cpf
before insert or update of cpf on public.clientes
for each row execute function public.assimilar_conta_cliente_por_cpf();

create or replace function public.vincular_contas_ao_cliente_por_cpf()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(coalesce(new.cpf, '')) = 11 then
    update public.usuarios
    set cliente_id = new.id
    where cpf = new.cpf
      and cliente_id is distinct from new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_vincular_contas_cpf on public.clientes;
create trigger clientes_vincular_contas_cpf
after insert or update of cpf on public.clientes
for each row execute function public.vincular_contas_ao_cliente_por_cpf();

-- Assimila também os registros que já existiam antes desta migração.
update public.usuarios u
set cliente_id = c.id
from public.clientes c
where length(coalesce(u.cpf, '')) = 11
  and u.cpf = c.cpf
  and u.cliente_id is distinct from c.id;
