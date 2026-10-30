create table if not exists public.cemig_credenciais_nativas (
 empresa_id uuid not null,
 usuario_id uuid not null,
 usina_id uuid not null,
 acesso_cifrado text not null,
 atualizado_em timestamptz not null default now(),
 primary key (empresa_id,usuario_id,usina_id)
);
alter table public.cemig_credenciais_nativas enable row level security;
revoke all on public.cemig_credenciais_nativas from anon, authenticated;
grant all on public.cemig_credenciais_nativas to service_role;
