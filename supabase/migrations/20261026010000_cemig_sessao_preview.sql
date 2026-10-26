begin;
create table if not exists public.cemig_sessoes_salvas_preview(
 empresa_id uuid not null, usuario_id uuid not null,
 versao_acesso timestamptz not null,
 estado_cifrado text not null check(estado_cifrado like 'v1.%'),
 expira_em timestamptz not null,
 primary key(empresa_id,usuario_id),
 foreign key(empresa_id,usuario_id) references public.cemig_credenciais_preview(empresa_id,usuario_id) on delete cascade
);
alter table public.cemig_sessoes_salvas_preview enable row level security;
revoke all on public.cemig_sessoes_salvas_preview from public,anon,authenticated;
grant select,insert,update,delete on public.cemig_sessoes_salvas_preview to service_role;
commit;
