create table public.autoleituras_medidor (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades_consumidoras(id) on delete cascade,
  data_programada date not null,
  leitura_kwh integer not null check (leitura_kwh between 0 and 999999999),
  foto bytea check (octet_length(foto) <= 700000),
  estado text not null default 'RECEBIDA' check (estado in ('RECEBIDA', 'EM_ENVIO', 'ENVIADA', 'RECUSADA', 'EM_REVISAO')),
  recebida_em timestamptz not null default now(),
  unique (unidade_id, data_programada)
);

alter table public.autoleituras_medidor enable row level security;
revoke all on public.autoleituras_medidor from anon, authenticated;

create function public.registrar_autoleitura_medidor(
  p_empresa uuid, p_cliente uuid, p_unidade uuid, p_leitura integer, p_foto_base64 text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_data date;
  v_numero text;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_id uuid;
begin
  select numero into v_numero from public.unidades_consumidoras
    where id = p_unidade and empresa_id = p_empresa and cliente_id = p_cliente
      and status = 'ATIVA' and tipo <> 'GERADORA' and zona_localizacao = 'RURAL' and autoleitura_rural_ativa
    for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Autoleitura indisponível para esta unidade.';
  end if;

  select proxima_leitura into v_data
    from public.faturas
    where empresa_id = p_empresa and cliente_id = p_cliente
      and (unidade_consumidora_id = p_unidade or (unidade_consumidora_id is null
        and regexp_replace(numero_instalacao, '[^0-9]', '', 'g') = regexp_replace(v_numero, '[^0-9]', '', 'g')))
    order by referencia desc nulls last, id desc
    limit 1;

  if v_data is null or v_hoje not between v_data - 5 and v_data then
    raise exception using errcode = 'P0001', message = 'Fora do período de registro baseado na última fatura da UC.';
  end if;

  insert into public.autoleituras_medidor (unidade_id, data_programada, leitura_kwh, foto)
    values (p_unidade, v_data, p_leitura, decode(p_foto_base64, 'base64'))
    on conflict (unidade_id, data_programada) do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from public.autoleituras_medidor
      where unidade_id = p_unidade and data_programada = v_data and leitura_kwh = p_leitura and estado <> 'RECUSADA'
        and (p_foto_base64 is null or foto = decode(p_foto_base64, 'base64'));
    if v_id is null then
      update public.autoleituras_medidor
        set leitura_kwh = p_leitura, foto = decode(p_foto_base64, 'base64'), estado = 'RECEBIDA'
        where unidade_id = p_unidade and data_programada = v_data and estado in ('RECEBIDA', 'RECUSADA')
        returning id into v_id;
      if v_id is null then
        raise exception using errcode = 'P0001', message = 'Esta leitura está em envio, já foi enviada ou aguarda revisão.';
      end if;
    end if;
  else
    perform public.criar_notificacao_com_push(jsonb_build_object(
      'usuario_id', acesso.usuario_id,
      'empresa_id', p_empresa,
      'tipo', 'AUTOLEITURA_RECEBIDA',
      'titulo', 'Leitura do medidor recebida',
      'detalhe', format('A leitura da UC %s para %s foi registrada na Andrade Energy e aguarda envio à Cemig.',
        v_numero, to_char(v_data, 'DD/MM/YYYY')),
      'rota', case when acesso.papel = 'LEITURA' then '/selecionar-unidade' else '/unidades' end,
      'chave_dedupe', format('autoleitura-recebida:%s:%s', v_id, acesso.usuario_id)
    ))
    from public.empresa_usuarios acesso
    where acesso.empresa_id = p_empresa and acesso.ativo
      and (acesso.papel in ('ADMIN_EMPRESA', 'SUPERADMIN')
        or (acesso.papel = 'LEITURA' and acesso.cliente_id = p_cliente));
  end if;
  return v_id;
end;
$$;

revoke all on function public.registrar_autoleitura_medidor(uuid, uuid, uuid, integer, text) from public, anon, authenticated;
grant select, insert on public.autoleituras_medidor to service_role;
grant execute on function public.registrar_autoleitura_medidor(uuid, uuid, uuid, integer, text) to service_role;
