alter table public.assinaturas_geradores
  add column if not exists asaas_checkout_id text;

create unique index if not exists assinaturas_geradores_asaas_checkout_idx
  on public.assinaturas_geradores (asaas_checkout_id)
  where asaas_checkout_id is not null;

create unique index if not exists assinaturas_geradores_asaas_subscription_idx
  on public.assinaturas_geradores (asaas_subscription_id)
  where asaas_subscription_id is not null;

comment on column public.assinaturas_geradores.asaas_checkout_id is
  'Checkout seguro usado para ativar a recorrencia desta assinatura no Asaas.';
