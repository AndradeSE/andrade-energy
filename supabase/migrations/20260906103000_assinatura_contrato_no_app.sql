alter table public.contratos
  add column if not exists assinatura_cliente_tracos jsonb,
  add column if not exists assinatura_cliente_hash text,
  add column if not exists documento_hash text,
  add column if not exists codigo_assinatura_confirmado_em timestamptz,
  add column if not exists configuracao_uc_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists revisao_configuracao_pendente boolean not null default false,
  add column if not exists versao integer not null default 1;

create table if not exists public.contratos_codigos_assinatura (
  contrato_id uuid primary key references public.contratos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  codigo_hash text not null,
  expira_em timestamptz not null,
  tentativas integer not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.contratos_codigos_assinatura enable row level security;

comment on table public.contratos_codigos_assinatura is
  'Códigos temporários usados para confirmar a assinatura eletrônica no aplicativo.';
