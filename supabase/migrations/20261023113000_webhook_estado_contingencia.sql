-- Historical rows retain NULL: their processing cannot be inferred retroactively.
alter table public.asaas_eventos add column if not exists processamento_estado text
  check(processamento_estado in ('PROCESSANDO','CONCLUIDO','REVISAO'));
alter table public.asaas_eventos add column if not exists processamento_atualizado_em timestamptz;
