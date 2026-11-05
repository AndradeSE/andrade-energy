-- A reserva ocorre imediatamente antes da ação que pode enviar a leitura.
create function public.reservar_envio_autoleitura(p_empresa uuid, p_leitura uuid, p_valor_conferido integer)
returns table(id uuid, numero text, data_programada date, leitura_kwh integer)
language sql set search_path = '' as $$
  update public.autoleituras_medidor leitura
  set estado = 'EM_ENVIO'
  from public.unidades_consumidoras uc
  where leitura.id = p_leitura and leitura.unidade_id = uc.id
    and uc.empresa_id = p_empresa and uc.status = 'ATIVA'
    and uc.tipo <> 'GERADORA' and uc.zona_localizacao = 'RURAL'
    and uc.autoleitura_rural_ativa and leitura.estado = 'RECEBIDA'
    and leitura.leitura_kwh = p_valor_conferido
    and (now() at time zone 'America/Sao_Paulo')::date
      between leitura.data_programada - 5 and leitura.data_programada
  returning leitura.id, uc.numero, leitura.data_programada, leitura.leitura_kwh;
$$;

revoke all on function public.reservar_envio_autoleitura(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.reservar_envio_autoleitura(uuid, uuid, integer) to service_role;
grant update (estado, leitura_kwh, foto) on public.autoleituras_medidor to service_role;
