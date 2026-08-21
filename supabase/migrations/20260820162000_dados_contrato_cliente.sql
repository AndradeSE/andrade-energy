-- Informações que compõem a aba Contrato do app Consumidor.
alter table public.contratos
  add column if not exists termo_adesao text,
  add column if not exists unidades_consumidoras integer not null default 1,
  add column if not exists economia_mensal_estimada numeric(14, 2),
  add column if not exists economia_anual_estimada numeric(14, 2),
  add column if not exists unidade_consumidora_id uuid references public.unidades_consumidoras(id) on delete set null;

alter table public.contratos
  drop constraint if exists contratos_unidades_consumidoras_positivas;

alter table public.contratos
  add constraint contratos_unidades_consumidoras_positivas
  check (unidades_consumidoras > 0);

-- O histórico é preservado. Cada UC pode ter vários contratos, mas somente um
-- contrato ativo/vigente por vez.
create unique index if not exists contratos_uma_vigencia_ativa_por_uc
  on public.contratos (unidade_consumidora_id)
  where unidade_consumidora_id is not null
    and upper(status) in ('ATIVO', 'VIGENTE');
