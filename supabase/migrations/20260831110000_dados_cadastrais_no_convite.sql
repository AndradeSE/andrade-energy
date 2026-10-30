-- Os dados cadastrais ficam vinculados ao convite até o consumidor criar a
-- conta. Unidade, modalidade e desconto continuam pertencendo à UC.
alter table public.convites_clientes
  add column if not exists telefone text,
  add column if not exists endereco text;
