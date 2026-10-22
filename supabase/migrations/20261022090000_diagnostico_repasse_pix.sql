alter table public.asaas_transferencias add column if not exists erro_codigo text;
alter table public.asaas_transferencias add column if not exists erro_detalhe_criptografado text;
comment on column public.asaas_transferencias.erro_detalhe_criptografado is 'Retorno do provedor criptografado; não expor em logs ou respostas públicas.';
