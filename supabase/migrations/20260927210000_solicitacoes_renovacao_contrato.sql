create table if not exists public.solicitacoes_renovacao_contrato (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  solicitado_por uuid references public.usuarios(id) on delete set null,
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'PROPOSTA_ENVIADA', 'ACEITA', 'CANCELADA')),
  solicitado_em timestamptz not null default now(),
  proposta_contrato_id uuid references public.contratos(id) on delete set null,
  proposta_enviada_em timestamptz,
  aceita_em timestamptz
);

create unique index if not exists solicitacao_renovacao_contrato_aberta_idx
  on public.solicitacoes_renovacao_contrato (contrato_id)
  where status in ('PENDENTE', 'PROPOSTA_ENVIADA');

create index if not exists solicitacao_renovacao_empresa_data_idx
  on public.solicitacoes_renovacao_contrato (empresa_id, solicitado_em desc);

alter table public.solicitacoes_renovacao_contrato enable row level security;
revoke all on public.solicitacoes_renovacao_contrato from anon, authenticated;
