alter table public.faturas
  add column if not exists leitura_anterior numeric(16,3),
  add column if not exists leitura_atual numeric(16,3),
  add column if not exists fator_multiplicacao numeric(12,4) not null default 1,
  add column if not exists tensao text,
  add column if not exists classificacao text,
  add column if not exists tipo_ligacao text;

comment on column public.faturas.leitura_anterior is 'Leitura anterior extraída da conta da concessionária.';
comment on column public.faturas.leitura_atual is 'Leitura atual extraída da conta da concessionária.';
comment on column public.faturas.tensao is 'Tensão nominal/fornecida registrada na competência.';
comment on column public.faturas.classificacao is 'Classe e subclasse tarifária registradas na competência.';
