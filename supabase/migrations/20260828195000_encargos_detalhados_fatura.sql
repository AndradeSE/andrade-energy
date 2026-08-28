alter table public.faturas
  add column if not exists valor_iluminacao_publica numeric(14,2) not null default 0,
  add column if not exists valor_impostos numeric(14,2) not null default 0;

comment on column public.faturas.valor_iluminacao_publica is 'Contribuição municipal de iluminação pública destacada na conta original.';
comment on column public.faturas.valor_impostos is 'Soma de ICMS, PASEP e COFINS destacados na conta original.';
