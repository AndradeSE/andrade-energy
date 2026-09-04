alter table public.unidades_consumidoras
  add column if not exists apelido text;

comment on column public.unidades_consumidoras.apelido is
  'Nome curto definido pelo consumidor para identificar a própria UC.';
