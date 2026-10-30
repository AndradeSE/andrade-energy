-- Contas de energia enviadas pelo consumidor fora do ciclo de faturamento.
-- Elas ficam privadas e podem ser reutilizadas pelo gerador no cadastro da UC.
create table if not exists public.faturas_anexadas_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  usuario_id uuid references public.usuarios(id) on delete set null,
  caminho_pdf text not null,
  arquivo_nome text not null,
  dados_fatura jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists faturas_anexadas_clientes_cliente_idx
  on public.faturas_anexadas_clientes (cliente_id, criado_em desc);

alter table public.faturas_anexadas_clientes enable row level security;

comment on table public.faturas_anexadas_clientes is
  'Contas de energia privadas anexadas pelo consumidor ou durante seu cadastro.';

-- Preserva no novo histórico os PDFs enviados no cadastro antes desta tabela.
insert into public.faturas_anexadas_clientes (
  cliente_id, empresa_id, usuario_id, caminho_pdf, arquivo_nome, dados_fatura, criado_em
)
select
  solicitacao.cliente_id,
  solicitacao.empresa_id,
  solicitacao.usuario_id,
  solicitacao.fatura_cemig_url,
  'Fatura de cadastro.pdf',
  coalesce(solicitacao.dados_fatura, '{}'::jsonb),
  solicitacao.created_at
from public.solicitacoes_cadastro_clientes as solicitacao
where solicitacao.fatura_cemig_url is not null
  and not exists (
    select 1
    from public.faturas_anexadas_clientes as anexo
    where anexo.cliente_id = solicitacao.cliente_id
      and anexo.caminho_pdf = solicitacao.fatura_cemig_url
  );
