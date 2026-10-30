alter table public.assinaturas_geradores
  add column if not exists arquivada_em timestamptz;

comment on column public.assinaturas_geradores.arquivada_em is
  'Oculta a assinatura cancelada das listas operacionais sem apagar seu histórico financeiro e contratual.';
