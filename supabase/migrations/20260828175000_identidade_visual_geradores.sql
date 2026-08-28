create table if not exists public.identidades_geradores (
  id uuid primary key default gen_random_uuid(),
  gerador_id uuid not null references public.usuarios(id) on delete cascade,
  nome text not null,
  logo_url text,
  cor_primaria text not null default '#087A46',
  cor_secundaria text not null default '#F7D75C',
  email_suporte text,
  telefone_suporte text,
  dominio text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (gerador_id),
  constraint identidades_geradores_cor_primaria_check check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  constraint identidades_geradores_cor_secundaria_check check (cor_secundaria ~ '^#[0-9A-Fa-f]{6}$')
);

create index if not exists identidades_geradores_gerador_idx on public.identidades_geradores (gerador_id);
alter table public.identidades_geradores enable row level security;
