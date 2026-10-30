-- Identidade de e-mail por empresa. A credencial do provedor permanece apenas
-- no servidor; empresas configuram somente remetente, resposta e domínio.
alter table public.empresas
  add column if not exists nome_remetente text,
  add column if not exists email_remetente text,
  add column if not exists email_resposta text,
  add column if not exists dominio_email_verificado boolean not null default false;

comment on column public.empresas.email_remetente is
  'Endereço From autorizado no provedor central; só é usado quando o domínio foi verificado.';
comment on column public.empresas.email_resposta is
  'Endereço Reply-To da empresa, sem acesso à chave global do provedor.';
comment on column public.empresas.dominio_email_verificado is
  'Confirma que o domínio do remetente foi validado no provedor transacional.';
