-- Administradores precisam operar simultaneamente no app Gerador e no portal.
-- A exclusividade permanece para gestores e consumidores.
drop index if exists public.sessoes_usuarios_uma_ativa_por_usuario_idx;

create or replace function public.criar_sessao_unica(
  p_usuario_id uuid,
  p_token_hash text,
  p_expira_em timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_usuario_id::text, 0));

  select upper(coalesce(perfil, ''))
  into v_perfil
  from public.usuarios
  where id = p_usuario_id;

  if v_perfil is distinct from 'ADMIN' then
    update public.sessoes_usuarios
    set revogada_em = now()
    where usuario_id = p_usuario_id
      and revogada_em is null;
  end if;

  insert into public.sessoes_usuarios (usuario_id, token_hash, expira_em)
  values (p_usuario_id, p_token_hash, p_expira_em);
end;
$$;

revoke all on function public.criar_sessao_unica(uuid, text, timestamptz) from public;
grant execute on function public.criar_sessao_unica(uuid, text, timestamptz) to service_role;

create index if not exists sessoes_usuarios_ativas_por_usuario_idx
  on public.sessoes_usuarios (usuario_id)
  where revogada_em is null;
