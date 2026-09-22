create table if not exists public.solicitacoes_cancelamento_contrato (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  solicitado_por uuid references public.usuarios(id) on delete set null,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','APROVADA','RECUSADA','CANCELADA')),
  solicitado_em timestamptz not null default now(),
  analisado_em timestamptz,
  analisado_por uuid references public.usuarios(id) on delete set null
);

create unique index if not exists solicitacao_cancelamento_contrato_pendente_idx
  on public.solicitacoes_cancelamento_contrato (contrato_id)
  where status = 'PENDENTE';

create index if not exists solicitacao_cancelamento_empresa_data_idx
  on public.solicitacoes_cancelamento_contrato (empresa_id, solicitado_em desc);

alter table public.solicitacoes_cancelamento_contrato enable row level security;
revoke all on public.solicitacoes_cancelamento_contrato from anon, authenticated;
