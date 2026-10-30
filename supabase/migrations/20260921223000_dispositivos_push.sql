create table if not exists public.dispositivos_push (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  token text not null unique,
  plataforma text not null default 'android',
  app_variante text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists dispositivos_push_destinatario_idx
  on public.dispositivos_push (usuario_id, empresa_id, ativo);

alter table public.dispositivos_push enable row level security;
revoke all on public.dispositivos_push from anon, authenticated;
