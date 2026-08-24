-- Uma única conta proprietária administra a criação de novos geradores.
create unique index if not exists usuarios_admin_ativo_unico_idx
  on public.usuarios (perfil)
  where perfil = 'ADMIN' and ativo = true;

create table if not exists public.convites_geradores (
  id uuid primary key default gen_random_uuid(),
  administrador_id uuid not null references public.usuarios(id) on delete cascade,
  nome text not null,
  cpf text not null,
  email text not null,
  token_hash text not null unique,
  status text not null default 'PENDENTE',
  expira_em timestamptz not null,
  aceito_em timestamptz,
  usuario_id uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint convites_geradores_status_check check (status in ('PENDENTE', 'ACEITO', 'CANCELADO', 'EXPIRADO'))
);

create index if not exists convites_geradores_admin_idx on public.convites_geradores (administrador_id, created_at desc);
create index if not exists convites_geradores_token_idx on public.convites_geradores (token_hash);
alter table public.convites_geradores enable row level security;
