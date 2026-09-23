-- PDFs assinados fora do aplicativo exigem conferência humana do gerador.
-- Corrige contratos/UCs antigos que foram liberados apenas porque havia um
-- arquivo anexado, embora a revisão ainda estivesse pendente.
update public.contratos
set status = 'ATIVO'
where contrato_assinado_url is not null
  and coalesce((dados_documento ->> 'assinatura_externa_pendente')::boolean, false) = true
  and nullif(dados_documento ->> 'assinatura_externa_validada_em', '') is null
  and status = 'VIGENTE';

update public.unidades_consumidoras uc
set status = 'PENDENTE_CONTRATO'
where exists (
  select 1
  from public.contratos c
  where c.unidade_consumidora_id = uc.id
    and c.contrato_assinado_url is not null
    and coalesce((c.dados_documento ->> 'assinatura_externa_pendente')::boolean, false) = true
    and nullif(c.dados_documento ->> 'assinatura_externa_validada_em', '') is null
);
