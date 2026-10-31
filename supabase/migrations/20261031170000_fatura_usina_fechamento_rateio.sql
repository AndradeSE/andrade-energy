-- Produção estimada/digitada não substitui leitura da fatura da geradora.
alter table public.fechamentos add column if not exists energia_gerada_fatura numeric;
alter table public.fechamentos add column if not exists fatura_usina_validada_em timestamptz;
comment on column public.fechamentos.energia_gerada_fatura is 'Energia obtida da fatura validada da geradora; precisa coincidir com a produção para liberar rateio automático.';

-- Recupera somente evidência já processada, da própria usina/empresa/competência,
-- com energia idêntica. Não presume origem dos demais fechamentos legados.
update public.fechamentos f
set energia_gerada_fatura=f.energia_gerada,
    fatura_usina_validada_em=r.processado_em
from public.recebimentos_faturas_email r
where r.status='PROCESSADO' and r.empresa_id=f.empresa_id
  and r.payload->'andrade_processamento'->>'tipo'='PRODUCAO_USINA'
  and r.payload->'andrade_processamento'->>'fechamentoId'=f.id::text
  and r.payload->'andrade_processamento'->>'usinaId'=f.usina_id::text
  and left(r.payload->'andrade_processamento'->>'competencia',10)=f.competencia::text
  and r.payload->'andrade_processamento'->>'energiaGerada' ~ '^[0-9]+([.][0-9]+)?$'
  and case when r.payload->'andrade_processamento'->>'energiaGerada' ~ '^[0-9]+([.][0-9]+)?$'
      then (r.payload->'andrade_processamento'->>'energiaGerada')::numeric end=f.energia_gerada
  and f.energia_gerada>0 and r.processado_em is not null
  and f.fatura_usina_validada_em is null;
