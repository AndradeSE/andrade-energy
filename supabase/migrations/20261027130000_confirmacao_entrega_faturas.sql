begin;
alter table public.notificacoes_fatura add column if not exists provedor_envio text;
alter table public.notificacoes_fatura add column if not exists provedor_mensagem_id text;
alter table public.notificacoes_fatura add column if not exists entrega_status text not null default 'NAO_CONFIRMADA';
alter table public.notificacoes_fatura add column if not exists entrega_consultada_em timestamptz;
alter table public.notificacoes_fatura add column if not exists entregue_em timestamptz;
commit;
