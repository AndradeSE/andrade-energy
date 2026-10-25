begin;
create table if not exists public.cemig_credenciais_preview(
 empresa_id uuid not null, usuario_id uuid not null,
 acesso_cifrado text not null check(acesso_cifrado like 'c1.%'),
 atualizado_em timestamptz not null default now(),primary key(empresa_id,usuario_id)
);
alter table public.cemig_credenciais_preview enable row level security;
revoke all on public.cemig_credenciais_preview from public,anon,authenticated;
grant select,insert,update,delete on public.cemig_credenciais_preview to service_role;
alter table public.cemig_simulacoes add column if not exists login_estado text not null default 'NAO_SOLICITADO'
 check(login_estado in ('NAO_SOLICITADO','FILA','ENVIANDO','ENVIADO','ERRO','CANCELADO'));
alter table public.cemig_simulacoes add column if not exists login_erro text;
commit;
