alter table public.assinaturas_geradores
  add column if not exists provedor_pagamento text not null default 'ASAAS'
    check (provedor_pagamento in ('ASAAS', 'MERCADO_PAGO')),
  add column if not exists mercado_pago_preapproval_id text;

alter table public.cobrancas_assinaturas_geradores
  add column if not exists provedor_pagamento text not null default 'ASAAS'
    check (provedor_pagamento in ('ASAAS', 'MERCADO_PAGO')),
  add column if not exists mercado_pago_payment_id text;

create unique index if not exists assinaturas_geradores_mp_preapproval_idx
  on public.assinaturas_geradores (mercado_pago_preapproval_id)
  where mercado_pago_preapproval_id is not null;

create unique index if not exists cobrancas_assinaturas_mp_payment_idx
  on public.cobrancas_assinaturas_geradores (mercado_pago_payment_id)
  where mercado_pago_payment_id is not null;

comment on column public.assinaturas_geradores.provedor_pagamento is
  'Provedor responsável pela recorrência SaaS. Mercado Pago é preferencial quando homologado; Asaas permanece como fallback.';
