-- Cadastro do consumidor em três etapas:
-- 1. envio da conta CEMIG e confirmação do e-mail;
-- 2. conferência pelo gerador;
-- 3. ativação da conta para login.
--
-- A evidência da conta de energia fica separada de `clientes`, pois os dados
-- do cliente são retornados em alguns fluxos operacionais e o PDF original
-- jamais deve ser exposto por uma consulta genérica de cliente.

create table if not exists public.solicitacoes_cadastro_clientes (
  id uuid primary key default gen_random_uuid(),
  convite_id uuid not null references public.convites_clientes(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  gestor_id uuid references public.usuarios(id) on delete set null,
  cpf text not null,
  fatura_cemig_url text not null,
  dados_fatura jsonb not null default '{}'::jsonb,
  status text not null default 'AGUARDANDO_VERIFICACAO_EMAIL',
  email_verificacao_token_hash text not null unique,
  email_verificacao_expira_em timestamptz not null,
  email_verificado_em timestamptz,
  confirmado_por uuid references public.usuarios(id) on delete set null,
  confirmado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint solicitacoes_cadastro_clientes_status_check
    check (status in ('AGUARDANDO_VERIFICACAO_EMAIL', 'AGUARDANDO_CONFIRMACAO_GERADOR', 'ATIVO', 'REJEITADO')),
  constraint solicitacoes_cadastro_clientes_usuario_key unique (usuario_id),
  constraint solicitacoes_cadastro_clientes_cliente_key unique (cliente_id),
  constraint solicitacoes_cadastro_clientes_convite_key unique (convite_id)
);

create index if not exists solicitacoes_cadastro_clientes_empresa_status_idx
  on public.solicitacoes_cadastro_clientes (empresa_id, status, created_at desc);

create index if not exists solicitacoes_cadastro_clientes_cliente_idx
  on public.solicitacoes_cadastro_clientes (cliente_id);

alter table public.solicitacoes_cadastro_clientes enable row level security;

comment on table public.solicitacoes_cadastro_clientes is
  'Evidências privadas e etapas do onboarding de consumidores antes da ativação pelo gerador.';

comment on column public.solicitacoes_cadastro_clientes.fatura_cemig_url is
  'Caminho privado no bucket faturas da conta CEMIG enviada no cadastro; não é uma URL pública.';

comment on column public.solicitacoes_cadastro_clientes.dados_fatura is
  'Dados extraídos da conta CEMIG usados para preenchemento e conferência do cadastro.';
