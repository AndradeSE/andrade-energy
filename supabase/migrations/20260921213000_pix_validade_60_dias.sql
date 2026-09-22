alter table public.faturas add column if not exists pix_expira_em timestamptz;
alter table public.asaas_cobrancas add column if not exists pix_expira_em timestamptz;

comment on column public.faturas.pix_expira_em is
  'Expiração informada pelo Asaas. O código só é disponibilizado quando cobre ao menos 60 dias.';
comment on column public.asaas_cobrancas.pix_expira_em is
  'Expiração informada pelo Asaas para o QR Code Pix dinâmico.';
