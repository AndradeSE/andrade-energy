create table if not exists public.cemig_native_captchas (
 id uuid primary key default gen_random_uuid(),
 chave text not null unique,
 empresa_id uuid not null,
 usuario_id uuid not null,
 usina_id uuid not null,
 estado text not null check (estado in ('CRIANDO','PROCESSANDO','RESOLVIDO','INCERTO')),
 task_id bigint,
 criado_em timestamptz not null default now(),
 expira_em timestamptz not null
);
alter table public.cemig_native_captchas enable row level security;
revoke all on public.cemig_native_captchas from anon, authenticated;
grant all on public.cemig_native_captchas to service_role;
