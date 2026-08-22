-- Define como cada UC recebe o custo de disponibilidade da concessionária.
-- O padrão preserva o comportamento atual: 100% desse custo é repassado.
alter table public.unidades_consumidoras
  add column if not exists percentual_repasse_disponibilidade numeric(5,2) not null default 100,
  add column if not exists fatura_somente_andrade boolean not null default false;

alter table public.unidades_consumidoras
  drop constraint if exists unidades_consumidoras_repasse_disponibilidade_check;

alter table public.unidades_consumidoras
  add constraint unidades_consumidoras_repasse_disponibilidade_check
  check (percentual_repasse_disponibilidade >= 0 and percentual_repasse_disponibilidade <= 100);

alter table public.faturas
  add column if not exists percentual_repasse_disponibilidade numeric(5,2) not null default 100,
  add column if not exists custo_disponibilidade_repassado numeric(14,2) not null default 0,
  add column if not exists fatura_somente_andrade boolean not null default false;

comment on column public.unidades_consumidoras.percentual_repasse_disponibilidade is
  'Percentual do custo de disponibilidade CEMIG que é repassado ao cliente.';
comment on column public.unidades_consumidoras.fatura_somente_andrade is
  'Quando verdadeiro, gera cobrança apenas da energia Andrade, sem unificar CEMIG.';
