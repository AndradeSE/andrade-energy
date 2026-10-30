alter table public.clientes
  add column if not exists titularidade_faturamento text not null default 'GERADOR';

alter table public.clientes
  drop constraint if exists clientes_titularidade_faturamento_check;

alter table public.clientes
  add constraint clientes_titularidade_faturamento_check
  check (titularidade_faturamento in ('GERADOR', 'CLIENTE'));

comment on column public.clientes.titularidade_faturamento is
  'Responsável por configurar o recebimento automático: GERADOR ou CLIENTE.';

alter table public.solicitacoes_cadastro_clientes
  alter column email_verificacao_token_hash drop not null,
  alter column email_verificacao_expira_em drop not null;
