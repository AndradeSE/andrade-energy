create table if not exists public.recuperacoes_senha (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  token_hash text not null unique,
  expira_em timestamptz not null,
  usado_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists recuperacoes_senha_usuario_id_idx
  on public.recuperacoes_senha (usuario_id, criado_em desc);

alter table public.recuperacoes_senha enable row level security;
revoke all on table public.recuperacoes_senha from anon, authenticated;
