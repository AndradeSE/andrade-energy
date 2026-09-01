-- Garante a coluna usada para abrir PDFs protegidos e força o PostgREST a
-- atualizar o cache de esquema. A operação é idempotente em bases que já
-- receberam a migração original.
alter table public.unidades_consumidoras
  add column if not exists cpf_titular text;

comment on column public.unidades_consumidoras.cpf_titular is
  'CPF/CNPJ do titular exatamente como consta na conta da concessionária; usado para abrir PDF protegido.';

notify pgrst, 'reload schema';
