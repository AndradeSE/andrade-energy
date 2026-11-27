alter table public.unidades_consumidoras
  add column if not exists meta_desconto_real_percentual numeric(7,4)
  check (meta_desconto_real_percentual between 0 and 100);
