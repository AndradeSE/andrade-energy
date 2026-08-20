-- Dados editáveis do perfil da conta. CPF permanece como identidade de negócio
-- e não é alterado pelo aplicativo.
alter table public.usuarios
  add column if not exists telefone text;
