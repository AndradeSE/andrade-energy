-- A baixa da fatura não substitui o estado atual da cobrança vinculada.
create or replace function public.historico_creditos_pagos_uc(
  p_empresa uuid, p_unidade uuid, p_numero text, p_cliente uuid
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare linhas jsonb;
begin
  if not exists(select 1 from public.unidades_consumidoras u
    where u.id=p_unidade and u.empresa_id=p_empresa and u.cliente_id=p_cliente and u.numero=p_numero) then
    raise exception 'UC não pertence ao cliente e à empresa informados.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'referencia',f.referencia,'modalidade_faturamento',f.modalidade_faturamento,
    'status',case when f.status in ('PAGO','PAGA')
      and exists(select 1 from public.asaas_cobrancas c where c.fatura_id=f.id and c.empresa_id=p_empresa)
      and not exists(select 1 from public.asaas_cobrancas c where c.fatura_id=f.id and c.empresa_id=p_empresa and c.status in ('RECEIVED','CONFIRMED','RECEIVED_IN_CASH'))
      then 'PAGAMENTO_PENDENTE_CONCILIACAO' else f.status end,
    'pagamentos',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'status',c.status) order by c.id)
      from public.asaas_cobrancas c where c.fatura_id=f.id and c.empresa_id=p_empresa),'[]'::jsonb),
    'base_calculo_kwh',f.base_calculo_kwh,'energia_compensada',f.energia_compensada,
    'saldo_atual',f.saldo_atual,'dados_extraidos',jsonb_build_object('creditos_pre_pagos',f.dados_extraidos->'creditos_pre_pagos')
  ) order by f.id),'[]'::jsonb) into linhas from public.faturas f
  where f.empresa_id=p_empresa and f.cliente_id=p_cliente
    and (f.unidade_consumidora_id=p_unidade or (f.unidade_consumidora_id is null and f.numero_instalacao=p_numero));
  return jsonb_build_object('faturas',linhas,'versao',md5(linhas::text));
end $$;
revoke all on function public.historico_creditos_pagos_uc(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.historico_creditos_pagos_uc(uuid,uuid,text,uuid) to service_role;

create or replace function public.travar_pagamento_creditos_uc()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare chave record; id_antigo uuid; id_novo uuid;
begin
  if tg_op<>'INSERT' then id_antigo:=old.fatura_id; end if;
  if tg_op<>'DELETE' then id_novo:=new.fatura_id; end if;
  for chave in select distinct f.empresa_id,f.numero_instalacao from public.faturas f
    where f.id in (id_antigo,id_novo) order by f.empresa_id,f.numero_instalacao loop
    perform pg_advisory_xact_lock(hashtextextended(chave.empresa_id::text || ':' || chave.numero_instalacao,0));
  end loop;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.travar_pagamento_creditos_uc() from public,anon,authenticated;
create trigger asaas_trava_creditos_uc before insert or update or delete on public.asaas_cobrancas
for each row execute function public.travar_pagamento_creditos_uc();
