-- Registra separadamente o valor original da concessionária, a parcela que
-- continua com o cliente e os custos assumidos pela usina.
alter table public.faturas
  add column if not exists valor_cemig_repassado numeric(14,2),
  add column if not exists valor_absorvido_disponibilidade numeric(14,2) not null default 0,
  add column if not exists valor_absorvido_fio_b numeric(14,2) not null default 0,
  add column if not exists valor_total_absorvido numeric(14,2) not null default 0;

comment on column public.faturas.valor_cemig_repassado is
  'Parcela da conta da concessionária efetivamente repassada ao cliente após as absorções configuradas na UC.';
comment on column public.faturas.valor_absorvido_disponibilidade is
  'Custo de disponibilidade assumido pela usina nesta competência.';
comment on column public.faturas.valor_absorvido_fio_b is
  'Diferença do Fio B assumida pela usina nesta competência.';
