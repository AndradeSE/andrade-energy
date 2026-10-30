alter table public.empresa_usuarios
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;

update public.empresa_usuarios eu
set cliente_id = u.cliente_id
from public.usuarios u
where eu.usuario_id = u.id
  and eu.empresa_id = u.empresa_id
  and eu.cliente_id is null
  and u.cliente_id is not null;

create index if not exists empresa_usuarios_cliente_id_idx
  on public.empresa_usuarios (cliente_id)
  where cliente_id is not null;
