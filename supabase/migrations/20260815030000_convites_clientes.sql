create table if not exists public.sessoes_usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  token_hash text not null unique,
  expira_em timestamptz not null,
  revogada_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sessoes_usuarios_token_idx on public.sessoes_usuarios (token_hash);
alter table public.sessoes_usuarios enable row level security;

create table if not exists public.convites_clientes (
  id uuid primary key default gen_random_uuid(),
  gestor_id uuid not null references public.usuarios(id) on delete cascade,
  usina_id uuid references public.usinas(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  nome text not null,
  cpf text not null,
  email text not null,
  token_hash text not null unique,
  status text not null default 'PENDENTE',
  expira_em timestamptz not null,
  aceito_em timestamptz,
  created_at timestamptz not null default now(),
  constraint convites_clientes_status_check check (status in ('PENDENTE', 'ACEITO', 'CANCELADO', 'EXPIRADO'))
);

create index if not exists convites_clientes_gestor_idx on public.convites_clientes (gestor_id, created_at desc);
create index if not exists convites_clientes_token_idx on public.convites_clientes (token_hash);
alter table public.convites_clientes enable row level security;
