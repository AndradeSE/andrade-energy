-- Funções exclusivas do backend; nenhuma nova permissão para clientes públicos.
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
    'status',f.status,'base_calculo_kwh',f.base_calculo_kwh,'energia_compensada',f.energia_compensada,
    'saldo_atual',f.saldo_atual,'dados_extraidos',jsonb_build_object('creditos_pre_pagos',f.dados_extraidos->'creditos_pre_pagos')
  ) order by f.id),'[]'::jsonb) into linhas from public.faturas f
  where f.empresa_id=p_empresa and f.cliente_id=p_cliente
    and (f.unidade_consumidora_id=p_unidade or (f.unidade_consumidora_id is null and f.numero_instalacao=p_numero));
  return jsonb_build_object('faturas',linhas,'versao',md5(linhas::text));
end $$;
revoke all on function public.historico_creditos_pagos_uc(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.historico_creditos_pagos_uc(uuid,uuid,text,uuid) to service_role;

-- Todos os lançamentos/alterações da mesma UC usam a mesma trava. O token
-- inclui também pagamentos: cálculo feito com histórico antigo não é emitido.
create or replace function public.travar_historico_creditos_uc()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare atual jsonb; registro public.faturas;
begin
  if tg_op='DELETE' then registro:=old; else registro:=new; end if;
  perform pg_advisory_xact_lock(hashtextextended(registro.empresa_id::text || ':' || registro.numero_instalacao,0));
  if tg_op in ('UPDATE','DELETE') and coalesce((old.dados_extraidos->'creditos_pre_pagos'->>'utilizado_kwh')::numeric,0)>0 then
    if tg_op='DELETE' then
      raise exception 'Esta fatura consumiu créditos já pagos. Concilie o saldo antes de excluir.';
    end if;
    if new.status in ('CANCELADA','CANCELADO','ESTORNADA','ESTORNADO')
      or (new.dados_extraidos->'creditos_pre_pagos') is distinct from (old.dados_extraidos->'creditos_pre_pagos')
      or new.energia_compensada is distinct from old.energia_compensada
      or new.base_calculo_kwh is distinct from old.base_calculo_kwh then
      raise exception 'Esta fatura consumiu créditos já pagos. Concilie o saldo antes de cancelar ou alterar a base.';
    end if;
  end if;
  if tg_op='INSERT' and registro.modalidade_faturamento='COMPENSACAO' and registro.unidade_consumidora_id is not null then
    atual:=public.historico_creditos_pagos_uc(registro.empresa_id,registro.unidade_consumidora_id,registro.numero_instalacao,registro.cliente_id);
    if registro.dados_extraidos->'creditos_pre_pagos' is not null then
      if (registro.dados_extraidos->'creditos_pre_pagos'->>'versao') is distinct from (atual->>'versao') then
        raise exception 'O histórico de créditos desta UC mudou. Recalcule a fatura antes de emitir.';
      end if;
    elsif exists(select 1 from jsonb_array_elements(atual->'faturas') x where x->>'modalidade_faturamento'='INJECAO') then
      raise exception 'Confira os créditos de injeção já pagos antes de emitir por compensação.';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.travar_historico_creditos_uc() from public,anon,authenticated;
create trigger faturas_trava_creditos_uc before insert or update or delete on public.faturas
for each row execute function public.travar_historico_creditos_uc();

create or replace function public.inserir_fatura_creditos_pagos(p_fatura jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare colunas text; campos text; resultado jsonb;
begin
  -- A lista é derivada exclusivamente das colunas reais, nunca SQL do payload.
  select string_agg(format('%I',a.attname),','),string_agg(format('r.%I',a.attname),',')
    into colunas,campos from pg_attribute a
    where a.attrelid='public.faturas'::regclass and a.attnum>0 and not a.attisdropped and a.attgenerated=''
      and p_fatura ? a.attname;
  if p_fatura->'dados_extraidos'->'creditos_pre_pagos' is null then raise exception 'Demonstrativo dos créditos ausente.'; end if;
  execute format('with inserida as (insert into public.faturas(%s) select %s from jsonb_populate_record(null::public.faturas,$1) r returning *) select to_jsonb(inserida) from inserida',colunas,campos)
    into resultado using p_fatura;
  return resultado;
end $$;
revoke all on function public.inserir_fatura_creditos_pagos(jsonb) from public,anon,authenticated;
grant execute on function public.inserir_fatura_creditos_pagos(jsonb) to service_role;
