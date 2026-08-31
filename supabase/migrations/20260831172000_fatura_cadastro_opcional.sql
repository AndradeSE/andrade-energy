-- O consumidor pode concluir o cadastro sem anexar a conta de energia.
-- Nessa situação, a solicitação permanece pendente de ativação manual pelo
-- gerador; quando houver PDF, ele continua armazenado como evidência privada.
alter table public.solicitacoes_cadastro_clientes
  alter column fatura_cemig_url drop not null;
