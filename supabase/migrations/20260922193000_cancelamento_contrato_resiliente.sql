alter table public.solicitacoes_cancelamento_contrato
  add column if not exists processamento_token uuid,
  add column if not exists processamento_iniciado_em timestamptz,
  add column if not exists notificado_em timestamptz;

alter table public.solicitacoes_cancelamento_contrato
  drop constraint if exists solicitacoes_cancelamento_contrato_status_check;

alter table public.solicitacoes_cancelamento_contrato
  add constraint solicitacoes_cancelamento_contrato_status_check
  check (status in ('PENDENTE','PROCESSANDO','APROVADA','RECUSADA','CANCELADA'));

drop index if exists public.solicitacao_cancelamento_contrato_pendente_idx;

create unique index solicitacao_cancelamento_contrato_em_aberto_idx
  on public.solicitacoes_cancelamento_contrato (contrato_id)
  where status in ('PENDENTE','PROCESSANDO');

alter table public.faturas
  add column if not exists contrato_encerramento_id uuid references public.contratos(id) on delete restrict;

create unique index if not exists faturas_contrato_encerramento_idx
  on public.faturas (contrato_encerramento_id)
  where contrato_encerramento_id is not null;

alter table public.notificacoes_app
  add column if not exists chave_dedupe text;

create unique index if not exists notificacoes_app_chave_dedupe_idx
  on public.notificacoes_app (chave_dedupe)
  where chave_dedupe is not null;

comment on column public.faturas.contrato_encerramento_id is
  'Garante no máximo uma fatura de encerramento por contrato.';

comment on column public.notificacoes_app.chave_dedupe is
  'Chave idempotente para avisos de negócio que podem ser reenviados.';
