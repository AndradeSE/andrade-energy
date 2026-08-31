alter table public.faturas
  add column if not exists valor_bandeira numeric(14,2) not null default 0;

comment on column public.faturas.valor_bandeira is 'Adicional de bandeira tarifária destacado na conta original da concessionária.';
