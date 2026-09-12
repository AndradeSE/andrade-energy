alter table public.empresa_usuarios
  drop constraint if exists empresa_usuarios_papel_check;

alter table public.empresa_usuarios
  add constraint empresa_usuarios_papel_check check (papel in (
    'SUPERADMIN', 'ADMIN_EMPRESA', 'GESTOR', 'LEITURA',
    'COLABORADOR_GERADOR', 'COLABORADOR_COMERCIAL'
  ));

alter table public.empresa_usuarios
  add column if not exists permissoes jsonb not null default '{}'::jsonb,
  add column if not exists convidado_por uuid references public.usuarios(id) on delete set null,
  add column if not exists ultimo_acesso_em timestamptz;

create table if not exists public.convites_colaboradores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  convidado_por uuid not null references public.usuarios(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  nome text not null,
  cpf text not null,
  email text not null,
  telefone text,
  papel text not null check (papel in ('COLABORADOR_GERADOR', 'COLABORADOR_COMERCIAL')),
  permissoes jsonb not null default '{}'::jsonb,
  token_hash text not null unique,
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'ACEITO', 'CANCELADO', 'EXPIRADO')),
  expira_em timestamptz not null,
  aceito_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists empresa_usuarios_colaboradores_idx
  on public.empresa_usuarios (empresa_id, papel, ativo);
create index if not exists convites_colaboradores_empresa_idx
  on public.convites_colaboradores (empresa_id, criado_em desc);
create index if not exists convites_colaboradores_email_idx
  on public.convites_colaboradores (empresa_id, email);

alter table public.convites_colaboradores enable row level security;
