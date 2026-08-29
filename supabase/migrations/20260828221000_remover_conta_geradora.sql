-- Remoção comercial preserva histórico fiscal/contratual, mas encerra acesso,
-- assinatura e cobranças ainda pendentes.
create or replace function public.remover_conta_geradora(p_gerador_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.cobrancas_assinaturas_geradores
  set status = 'CANCELADA', atualizado_em = now()
  where assinatura_id in (
    select id from public.assinaturas_geradores where gerador_id = p_gerador_id
  ) and status in ('PENDENTE', 'VENCIDA');

  update public.assinaturas_geradores
  set status = 'CANCELADA', cancelada_em = coalesce(cancelada_em, now()), atualizado_em = now()
  where gerador_id = p_gerador_id and status <> 'CANCELADA';

  update public.sessoes_usuarios
  set revogada_em = now()
  where usuario_id = p_gerador_id and revogada_em is null;

  update public.usuarios
  set ativo = false
  where id = p_gerador_id and perfil = 'GESTOR';

  if not found then
    raise exception 'Conta geradora não encontrada.';
  end if;
end;
$$;

revoke all on function public.remover_conta_geradora(uuid) from public;
grant execute on function public.remover_conta_geradora(uuid) to service_role;
