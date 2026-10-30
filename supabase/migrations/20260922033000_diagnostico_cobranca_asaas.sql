alter table public.faturas
  add column if not exists cobranca_erro text,
  add column if not exists cobranca_erro_em timestamptz;

comment on column public.faturas.cobranca_erro is
  'Última falha operacional ao emitir ou atualizar a cobrança no provedor.';
