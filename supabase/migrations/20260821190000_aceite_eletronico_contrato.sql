-- Evidências do aceite eletrônico realizado pelo titular no aplicativo.
alter table public.contratos
  add column if not exists aceite_cliente_em timestamptz,
  add column if not exists aceite_cliente_usuario_id uuid references public.usuarios(id) on delete set null,
  add column if not exists aceite_cliente_ip text,
  add column if not exists aceite_cliente_user_agent text;

comment on column public.contratos.aceite_cliente_em is
  'Data e hora em que o titular confirmou o aceite eletrônico no aplicativo.';
