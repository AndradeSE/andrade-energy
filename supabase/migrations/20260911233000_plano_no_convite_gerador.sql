alter table public.convites_clientes
  add column if not exists plano_id uuid references public.planos_geradores(id) on delete set null,
  add column if not exists ciclo_assinatura text,
  add column if not exists dias_teste integer not null default 0;

alter table public.convites_clientes
  drop constraint if exists convites_clientes_ciclo_assinatura_check;

alter table public.convites_clientes
  add constraint convites_clientes_ciclo_assinatura_check
  check (ciclo_assinatura is null or ciclo_assinatura in ('MENSAL', 'ANUAL'));
