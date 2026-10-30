alter table public.notificacoes_app add column if not exists email_enviado_em timestamptz;
alter table public.notificacoes_app add column if not exists email_envio_iniciado_em timestamptz;
