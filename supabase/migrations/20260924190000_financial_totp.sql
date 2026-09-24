create table if not exists public.financeiro_autenticadores (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  segredo_criptografado text not null,
  confirmado boolean not null default false,
  expira_em timestamptz,
  ultimo_passo bigint not null default -1,
  tentativas integer not null default 0,
  bloqueado_ate timestamptz,
  atualizado_em timestamptz not null default now()
);

alter table public.financeiro_autenticadores enable row level security;
revoke all on table public.financeiro_autenticadores from anon, authenticated;

-- Exige nova autorização com autenticador para automações já ativas.
update public.gerador_carteiras set transferencia_automatica = false where transferencia_automatica = true;
update public.carteira_comercial_assinaturas set transferencia_automatica = false where transferencia_automatica = true;
