-- Uma mesma conta de consumidor pode aceitar convites de geradores distintos.
-- O onboarding continua único dentro de cada empresa, mas deixa de ser único
-- globalmente por usuário.
alter table public.solicitacoes_cadastro_clientes
  drop constraint if exists solicitacoes_cadastro_clientes_usuario_key;

create unique index if not exists solicitacoes_cadastro_clientes_usuario_empresa_key
  on public.solicitacoes_cadastro_clientes (usuario_id, empresa_id);

comment on index public.solicitacoes_cadastro_clientes_usuario_empresa_key is
  'Permite que a mesma conta consumidora tenha um onboarding independente por empresa geradora.';
