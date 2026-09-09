alter table public.assinaturas_geradores
  add column if not exists parcelas_cartao integer not null default 1
  check (parcelas_cartao between 1 and 12);

comment on column public.assinaturas_geradores.parcelas_cartao is
  'Quantidade escolhida no checkout; 1 para recorrencia ou pagamento anual a vista.';
