alter table public.faturas
  add column if not exists pdf_boleto_url text,
  add column if not exists codigo_pix text,
  add column if not exists linha_digitavel text;

comment on column public.faturas.pdf_boleto_url is 'Caminho do boleto PDF no bucket privado faturas.';
comment on column public.faturas.codigo_pix is 'Código PIX copia e cola da cobrança.';
comment on column public.faturas.linha_digitavel is 'Linha digitável do boleto.';
