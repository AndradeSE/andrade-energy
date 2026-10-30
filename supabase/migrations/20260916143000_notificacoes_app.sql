create table if not exists public.notificacoes_app (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  detalhe text,
  rota text,
  criado_em timestamptz not null default now()
);
create index if not exists notificacoes_app_usuario_data_idx on public.notificacoes_app (usuario_id, empresa_id, criado_em desc);
alter table public.notificacoes_app enable row level security;
revoke all on public.notificacoes_app from anon, authenticated;
