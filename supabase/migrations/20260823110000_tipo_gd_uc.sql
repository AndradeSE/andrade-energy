alter table public.unidades_consumidoras
  add column if not exists tipo_gd text;

alter table public.unidades_consumidoras
  drop constraint if exists unidades_consumidoras_tipo_gd_check;

alter table public.unidades_consumidoras
  add constraint unidades_consumidoras_tipo_gd_check
  check (tipo_gd is null or tipo_gd in ('GD1', 'GD2', 'MISTA'));

comment on column public.unidades_consumidoras.tipo_gd is
  'Modalidade GD identificada na conta importada: GD1, GD2 ou MISTA.';
