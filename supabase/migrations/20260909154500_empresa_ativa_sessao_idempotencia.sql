alter table public.sessoes_usuarios
  add column if not exists empresa_ativa_id uuid references public.empresas(id) on delete restrict;

update public.sessoes_usuarios s
set empresa_ativa_id = u.empresa_id
from public.usuarios u
where u.id = s.usuario_id
  and s.empresa_ativa_id is null;

create index if not exists sessoes_usuarios_empresa_ativa_idx
  on public.sessoes_usuarios (empresa_ativa_id)
  where revogada_em is null;

alter table public.asaas_transferencias
  add column if not exists idempotency_key text;

create unique index if not exists asaas_transferencias_empresa_idempotencia_idx
  on public.asaas_transferencias (empresa_id, idempotency_key)
  where idempotency_key is not null;
