create table if not exists public.carteira_comercial_assinaturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  pix_tipo text,
  pix_chave_criptografada text,
  transferencia_automatica boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id)
);

alter table public.carteira_comercial_assinaturas enable row level security;
revoke all on table public.carteira_comercial_assinaturas from anon, authenticated;

