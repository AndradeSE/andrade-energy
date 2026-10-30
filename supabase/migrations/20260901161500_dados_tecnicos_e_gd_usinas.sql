alter table public.usinas
  add column if not exists geracao_media numeric(14,3) not null default 0,
  add column if not exists investimento numeric(14,2) not null default 0;

update public.usinas u
set tipo_gd = case
  when exists (
    select 1 from public.unidades_consumidoras uc
    where uc.usina_id = u.id and uc.tipo_gd = 'GD2'
  ) then 'GD2'
  else 'GD1'
end
where u.tipo_gd is null;

alter table public.usinas alter column tipo_gd set default 'GD1';

comment on column public.usinas.geracao_media is
  'Produção média mensal usada como fallback da alocação automática quando ainda não existem 12 competências processadas.';
