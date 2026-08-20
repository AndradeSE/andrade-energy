-- Recebimento automático de contas da concessionária por e-mail.
-- O endereço público contém apenas um token aleatório, nunca CPF ou número da UC.

alter table public.unidades_consumidoras
  add column if not exists recebimento_email_token text,
  add column if not exists recebimento_email_ativo boolean not null default false,
  add column if not exists recebimento_email_ativado_em timestamptz,
  add column if not exists recebimento_email_ultimo_em timestamptz,
  add column if not exists recebimento_email_status text,
  add column if not exists recebimento_email_erro text;

create unique index if not exists unidades_consumidoras_recebimento_email_token_key
  on public.unidades_consumidoras (recebimento_email_token)
  where recebimento_email_token is not null;

create table if not exists public.recebimentos_faturas_email (
  id uuid primary key default gen_random_uuid(),
  provedor text not null default 'RESEND',
  provedor_email_id text not null,
  provedor_evento_id text,
  unidade_consumidora_id uuid references public.unidades_consumidoras(id) on delete set null,
  destinatario text not null,
  remetente text,
  assunto text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDENTE',
  tentativas integer not null default 0,
  proxima_tentativa_em timestamptz not null default now(),
  arquivo_nome text,
  arquivo_hash text,
  caminho_pdf text,
  fatura_id uuid references public.faturas(id) on delete set null,
  erro text,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recebimentos_faturas_email_status_check
    check (status in ('PENDENTE', 'PROCESSANDO', 'PROCESSADO', 'IGNORADO', 'ERRO')),
  constraint recebimentos_faturas_email_provedor_email_key
    unique (provedor, provedor_email_id)
);

create unique index if not exists recebimentos_faturas_email_arquivo_uc_key
  on public.recebimentos_faturas_email (unidade_consumidora_id, arquivo_hash)
  where arquivo_hash is not null;

create index if not exists recebimentos_faturas_email_fila_idx
  on public.recebimentos_faturas_email (status, proxima_tentativa_em, created_at);

create index if not exists recebimentos_faturas_email_unidade_idx
  on public.recebimentos_faturas_email (unidade_consumidora_id, recebido_em desc);

alter table public.recebimentos_faturas_email enable row level security;

comment on column public.unidades_consumidoras.recebimento_email_token is
  'Token opaco usado no endereço exclusivo de recebimento de faturas por e-mail.';

comment on table public.recebimentos_faturas_email is
  'Fila idempotente de contas enviadas automaticamente para cada unidade consumidora.';
