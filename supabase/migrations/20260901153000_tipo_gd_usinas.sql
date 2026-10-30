alter table public.usinas add column if not exists tipo_gd text;

alter table public.usinas drop constraint if exists usinas_tipo_gd_check;
alter table public.usinas add constraint usinas_tipo_gd_check
  check (tipo_gd is null or tipo_gd in ('GD1', 'GD2'));

comment on column public.usinas.tipo_gd is
  'Modalidade regulatória da usina. UCs vinculadas a uma usina GD2 herdam GD2 obrigatoriamente.';

update public.unidades_consumidoras uc
set tipo_gd = 'GD2'
from public.usinas u
where uc.usina_id = u.id
  and u.tipo_gd = 'GD2'
  and uc.tipo = 'BENEFICIARIA'
  and uc.tipo_gd is distinct from 'GD2';
