-- Uma UC só fica ativa depois da assinatura do contrato.
-- Corrige registros antigos criados como ATIVA antes da conclusão do fluxo.
update public.unidades_consumidoras uc
set status = 'PENDENTE_CONTRATO'
where uc.status = 'ATIVA'
  and uc.cliente_id is not null
  and not exists (
    select 1
    from public.contratos c
    where c.unidade_consumidora_id = uc.id
      and (
        c.aceite_cliente_em is not null
        or nullif(trim(c.contrato_assinado_url), '') is not null
      )
  );
