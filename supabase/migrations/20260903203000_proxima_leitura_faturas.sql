alter table public.faturas
  add column if not exists proxima_leitura date;

comment on column public.faturas.proxima_leitura is
  'Data prevista pela concessionária para a próxima leitura da unidade consumidora.';
