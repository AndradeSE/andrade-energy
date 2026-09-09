create table if not exists public.auditoria_seguranca (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  usuario_id uuid references public.usuarios(id) on delete set null,
  acao text not null,
  recurso text not null,
  recurso_id uuid,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists auditoria_seguranca_empresa_data_idx on public.auditoria_seguranca (empresa_id, criado_em desc);
alter table public.auditoria_seguranca enable row level security;
revoke all on public.auditoria_seguranca from anon, authenticated;

alter table public.gerador_carteiras add column if not exists pix_chave_criptografada text;
comment on column public.gerador_carteiras.pix_chave_criptografada is 'Chave Pix protegida por AES-256-GCM no backend.';
