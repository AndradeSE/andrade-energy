create table if not exists public.notificacoes_fatura (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid not null references public.faturas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  canal text not null,
  destinatario text not null,
  status text not null default 'PENDENTE',
  tentativas integer not null default 0,
  proxima_tentativa_em timestamptz not null default now(),
  enviada_em timestamptz,
  erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notificacoes_fatura_canal_check check (canal in ('EMAIL', 'WHATSAPP')),
  constraint notificacoes_fatura_status_check check (status in ('PENDENTE', 'PROCESSANDO', 'ENVIADA', 'ERRO')),
  constraint notificacoes_fatura_unica unique (fatura_id, canal)
);

create index if not exists notificacoes_fatura_pendentes_idx
  on public.notificacoes_fatura (status, proxima_tentativa_em);

alter table public.notificacoes_fatura enable row level security;

