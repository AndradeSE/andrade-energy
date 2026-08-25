create table if not exists public.gerador_carteiras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuarios(id) on delete cascade,
  usina_id uuid references public.usinas(id) on delete set null,
  asaas_wallet_id text,
  pix_chave text,
  pix_tipo text check (pix_tipo in ('CPF','CNPJ','EMAIL','PHONE','EVP')),
  transferencia_automatica boolean not null default false,
  status text not null default 'ATIVA' check (status in ('PENDENTE','ATIVA','BLOQUEADA')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.asaas_cobrancas
  add column if not exists gerador_carteira_id uuid references public.gerador_carteiras(id) on delete set null,
  add column if not exists valor_liquido numeric(12,2);

alter table public.asaas_transferencias
  add column if not exists gerador_carteira_id uuid references public.gerador_carteiras(id) on delete set null,
  add column if not exists solicitada_por uuid references public.usuarios(id) on delete set null,
  add column if not exists modalidade text not null default 'AUTOMATICA';

-- Transferências manuais não pertencem necessariamente a uma cobrança específica.
alter table public.asaas_transferencias alter column cobranca_id drop not null;

create index if not exists idx_asaas_cobrancas_carteira on public.asaas_cobrancas(gerador_carteira_id);
create index if not exists idx_asaas_transferencias_carteira on public.asaas_transferencias(gerador_carteira_id);

alter table public.gerador_carteiras enable row level security;
