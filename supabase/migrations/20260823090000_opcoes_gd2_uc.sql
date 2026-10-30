-- Configuração específica da GD II por unidade consumidora.
-- O padrão mantém o comportamento anterior: ambos os custos permanecem
-- repassados ao cliente, até que o gerador opte por absorvê-los.
alter table public.unidades_consumidoras
  add column if not exists repassar_disponibilidade_gd1 boolean not null default true,
  add column if not exists repassar_disponibilidade_gd2 boolean not null default true,
  add column if not exists repassar_diferenca_fio_b_gd2 boolean not null default true;

alter table public.faturas
  add column if not exists repassar_disponibilidade_gd1 boolean not null default true,
  add column if not exists repassar_disponibilidade_gd2 boolean not null default true,
  add column if not exists repassar_diferenca_fio_b_gd2 boolean not null default true,
  add column if not exists diferenca_fio_b numeric(14,2) not null default 0,
  add column if not exists diferenca_fio_b_repassada numeric(14,2) not null default 0;

comment on column public.unidades_consumidoras.repassar_disponibilidade_gd2 is
  'Na GD II, define se o custo de disponibilidade recalculado é repassado ao cliente.';
comment on column public.unidades_consumidoras.repassar_disponibilidade_gd1 is
  'Na GD I, define se o custo de disponibilidade recalculado é repassado ao cliente.';
comment on column public.unidades_consumidoras.repassar_diferenca_fio_b_gd2 is
  'Na GD II, define se a diferença tarifária do Fio B é repassada ao cliente.';
