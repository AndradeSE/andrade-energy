-- Serializa logins da mesma conta. Sem este bloqueio, dois pedidos de login
-- simultâneos poderiam disputar o índice de sessão ativa e retornar 23505.
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
begin
  perform pg_advisory_xact_lock(hashtextextended(p_usuario_id::text, 0));

  update public.sessoes_usuarios
  set revogada_em = now()
  where usuario_id = p_usuario_id
    and revogada_em is null;

  insert into public.sessoes_usuarios (usuario_id, token_hash, expira_em)
  values (p_usuario_id, p_token_hash, p_expira_em);
end;
$$;

revoke all on function public.criar_sessao_unica(uuid, text, timestamptz) from public;
grant execute on function public.criar_sessao_unica(uuid, text, timestamptz) to service_role;
