alter table public.gerador_carteiras
  add column if not exists pix_titular_nome text;

comment on column public.gerador_carteiras.pix_titular_nome is
  'Nome do titular retornado pela validação da chave Pix no momento do cadastro.';
