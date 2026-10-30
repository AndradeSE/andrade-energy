-- A média de consumo e o rateio pertencem à UC. Um mesmo cliente pode ter
-- mais de uma unidade consumidora, cada uma vinculada a uma usina/regra.

alter table public.unidades_consumidoras
  add column if not exists consumo_medio_kwh numeric(12,2),
  add column if not exists percentual_rateio numeric(5,2)
    check (percentual_rateio >= 0 and percentual_rateio <= 100);

-- Preserva o comportamento dos cadastros antigos: copia a configuração do
-- cliente somente para a sua UC principal, ou quando ele possui apenas uma UC.
-- Isso evita duplicar a alocação histórica em várias unidades do mesmo CPF.
with quantidade_por_cliente as (
  select
    cliente_id,
    count(*) as quantidade
  from public.unidades_consumidoras
  where cliente_id is not null
  group by cliente_id
)
update public.unidades_consumidoras as uc
set
  consumo_medio_kwh = coalesce(uc.consumo_medio_kwh, c.consumo_medio_kwh),
  percentual_rateio = coalesce(uc.percentual_rateio, c.percentual_rateio),
  updated_at = now()
from public.clientes as c
left join quantidade_por_cliente as quantidade
  on quantidade.cliente_id = c.id
where uc.cliente_id = c.id
  and (
    nullif(regexp_replace(coalesce(c.uc, ''), '\D', '', 'g'), '') = uc.numero
    or coalesce(quantidade.quantidade, 0) = 1
  )
  and (
    uc.consumo_medio_kwh is null
    or uc.percentual_rateio is null
  );

comment on column public.unidades_consumidoras.consumo_medio_kwh is
  'Média mensal de consumo da própria UC, usada para sugerir a alocação por compensação.';

comment on column public.unidades_consumidoras.percentual_rateio is
  'Percentual de energia da usina alocado à própria UC.';
