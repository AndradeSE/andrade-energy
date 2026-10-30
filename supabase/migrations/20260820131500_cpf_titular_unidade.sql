-- CPF/CNPJ exibido na conta da concessionária. Ele pertence à UC, pois o
-- titular cadastral da unidade pode ser diferente do CPF geral do cliente.
alter table public.unidades_consumidoras
  add column if not exists cpf_titular text;

update public.unidades_consumidoras uc
set cpf_titular = regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g')
from public.clientes c
where uc.cliente_id = c.id
  and nullif(regexp_replace(coalesce(uc.cpf_titular, ''), '\D', '', 'g'), '') is null
  and nullif(regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g'), '') is not null;

create or replace function public.normalizar_cpf_titular_unidade()
returns trigger
language plpgsql
as $$
begin
  new.cpf_titular := nullif(regexp_replace(coalesce(new.cpf_titular, ''), '\D', '', 'g'), '');
  return new;
end;
$$;

drop trigger if exists unidades_consumidoras_normalizar_cpf_titular on public.unidades_consumidoras;
create trigger unidades_consumidoras_normalizar_cpf_titular
before insert or update of cpf_titular on public.unidades_consumidoras
for each row execute function public.normalizar_cpf_titular_unidade();

comment on column public.unidades_consumidoras.cpf_titular is
  'CPF/CNPJ do titular exatamente como consta na conta da concessionária; usado para abrir PDF protegido.';
