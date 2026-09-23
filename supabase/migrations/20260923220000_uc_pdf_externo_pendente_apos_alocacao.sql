-- A alocação anterior podia reativar a UC depois do envio do PDF externo.
update public.unidades_consumidoras uc
set status = 'PENDENTE_CONTRATO'
where uc.status = 'ATIVA'
  and exists (
    select 1 from public.contratos c
    where c.unidade_consumidora_id = uc.id
      and c.contrato_assinado_url is not null
      and c.dados_documento ->> 'assinatura_externa_pendente' = 'true'
      and nullif(c.dados_documento ->> 'assinatura_externa_validada_em', '') is null
  );
