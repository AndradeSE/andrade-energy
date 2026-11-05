alter table public.autoleituras_medidor
  add column protocolo_cemig text,
  add column estimativa_cemig numeric(12,2) check (estimativa_cemig >= 0),
  add column retorno_em timestamptz,
  add constraint autoleitura_protocolo_confirmado check (
    (estado = 'ENVIADA') = (protocolo_cemig is not null)
    and (protocolo_cemig is null or protocolo_cemig ~ '^[0-9]{6,30}$')
  );

create function public.registrar_retorno_autoleitura(
  p_empresa uuid, p_leitura uuid, p_estado text, p_protocolo text, p_estimativa numeric
) returns boolean
language plpgsql set search_path = '' as $$
declare
  v_cliente uuid;
begin
  if p_estado is null or p_estado not in ('ENVIADA', 'RECUSADA', 'EM_REVISAO')
    or (p_estado <> 'ENVIADA' and (p_protocolo is not null or p_estimativa is not null)) then
    raise exception using errcode = '22023', message = 'Retorno da Cemig inválido.';
  end if;

  update public.autoleituras_medidor leitura
  set estado = p_estado, protocolo_cemig = p_protocolo,
      estimativa_cemig = p_estimativa, retorno_em = now()
  from public.unidades_consumidoras uc
  where leitura.id = p_leitura and leitura.unidade_id = uc.id
    and uc.empresa_id = p_empresa and leitura.estado = 'EM_ENVIO'
  returning uc.cliente_id into v_cliente;
  if not found then return false; end if;

  perform public.criar_notificacao_com_push(jsonb_build_object(
    'usuario_id', acesso.usuario_id, 'empresa_id', p_empresa,
    'tipo', 'AUTOLEITURA_' || p_estado,
    'titulo', case p_estado when 'ENVIADA' then 'Leitura confirmada pela Cemig'
      when 'RECUSADA' then 'Leitura recusada pela Cemig' else 'Envio da leitura aguarda conferência' end,
    'detalhe', case p_estado when 'ENVIADA' then 'Protocolo Cemig ' || p_protocolo
      when 'RECUSADA' then 'Confira e corrija o valor informado no app.'
      else 'A Cemig ainda não confirmou o resultado do envio.' end,
    'rota', case when acesso.papel = 'LEITURA' then '/selecionar-unidade' else '/unidades' end,
    'chave_dedupe', format('autoleitura-retorno:%s:%s:%s', p_leitura, p_estado, acesso.usuario_id)
  ))
  from public.empresa_usuarios acesso
  where acesso.empresa_id = p_empresa and acesso.ativo
    and (acesso.papel in ('ADMIN_EMPRESA', 'SUPERADMIN')
      or (acesso.papel = 'LEITURA' and acesso.cliente_id = v_cliente));
  return true;
end;
$$;

revoke all on function public.registrar_retorno_autoleitura(uuid, uuid, text, text, numeric) from public, anon, authenticated;
grant execute on function public.registrar_retorno_autoleitura(uuid, uuid, text, text, numeric) to service_role;
grant update (protocolo_cemig, estimativa_cemig, retorno_em) on public.autoleituras_medidor to service_role;
