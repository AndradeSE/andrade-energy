insert into public.empresa_usuarios (empresa_id, usuario_id, papel, principal, ativo)
select e.id, u.id, 'ADMIN_EMPRESA', e.id = u.empresa_id, true
from public.empresas e
cross join public.usuarios u
where e.ativo = true
  and u.ativo = true
  and upper(u.perfil) = 'ADMIN'
  and u.empresa_id = '00000000-0000-4000-8000-000000000001'::uuid
on conflict (empresa_id, usuario_id) do update set
  papel = excluded.papel,
  ativo = true,
  atualizado_em = now();
