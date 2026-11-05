create function public.enfileirar_lembretes_autoleitura()
returns void language plpgsql set search_path = '' as $$
begin
  perform public.criar_notificacao_com_push(jsonb_build_object(
    'usuario_id', acesso.usuario_id,
    'empresa_id', uc.empresa_id,
    'tipo', 'AUTOLEITURA_LEMBRETE',
    'titulo', 'Hora de informar a leitura do medidor',
    'detalhe', format('A próxima leitura da UC %s está programada para %s na última fatura.',
      uc.numero, to_char(fatura.proxima_leitura, 'DD/MM/YYYY')),
    'rota', '/selecionar-unidade',
    'chave_dedupe', format('autoleitura:%s:%s:%s', uc.id, fatura.proxima_leitura, acesso.usuario_id)
  ))
  from public.unidades_consumidoras uc
  join public.empresa_usuarios acesso on acesso.empresa_id = uc.empresa_id
    and acesso.cliente_id = uc.cliente_id and acesso.papel = 'LEITURA' and acesso.ativo
  cross join lateral (
    select f.proxima_leitura
    from public.faturas f
    where f.empresa_id = uc.empresa_id and f.cliente_id = uc.cliente_id
      and (f.unidade_consumidora_id = uc.id or (f.unidade_consumidora_id is null
        and regexp_replace(f.numero_instalacao, '[^0-9]', '', 'g') = regexp_replace(uc.numero, '[^0-9]', '', 'g')))
    order by f.referencia desc nulls last, f.id desc
    limit 1
  ) fatura
  where uc.status = 'ATIVA' and uc.tipo <> 'GERADORA'
    and uc.zona_localizacao = 'RURAL' and uc.autoleitura_rural_ativa
    and fatura.proxima_leitura = (now() at time zone 'America/Sao_Paulo')::date + 5
    and not exists (
      select 1 from public.autoleituras_medidor leitura
      where leitura.unidade_id = uc.id and leitura.data_programada = fatura.proxima_leitura
    );
end;
$$;

revoke all on function public.enfileirar_lembretes_autoleitura() from public, anon, authenticated;
grant execute on function public.enfileirar_lembretes_autoleitura() to service_role;
