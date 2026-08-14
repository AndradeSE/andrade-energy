-- Configuração comercial definida no cadastro do cliente.
alter table public.clientes
  add column if not exists email text,
  add column if not exists whatsapp text,
  add column if not exists modalidade_faturamento text not null default 'COMPENSACAO',
  add column if not exists desconto_percentual numeric(5, 2) not null default 40;

alter table public.clientes
  drop constraint if exists clientes_modalidade_faturamento_check;

alter table public.clientes
  add constraint clientes_modalidade_faturamento_check
  check (modalidade_faturamento in ('INJECAO', 'COMPENSACAO'));

alter table public.clientes
  drop constraint if exists clientes_desconto_percentual_check;

alter table public.clientes
  add constraint clientes_desconto_percentual_check
  check (desconto_percentual >= 0 and desconto_percentual <= 100);

-- Memória de cálculo imutável de cada fechamento.
alter table public.faturas
  add column if not exists modalidade_faturamento text,
  add column if not exists base_calculo_kwh numeric(14, 3),
  add column if not exists valor_energia_cheia numeric(14, 2),
  add column if not exists desconto_contratado_percentual numeric(5, 2),
  add column if not exists desconto_contratado_valor numeric(14, 2),
  add column if not exists valor_usina numeric(14, 2),
  add column if not exists valor_referencia_sem_andrade numeric(14, 2),
  add column if not exists valor_total_unificado numeric(14, 2),
  add column if not exists desconto_real_percentual numeric(7, 4),
  add column if not exists pdf_cemig_url text,
  add column if not exists pdf_usina_url text,
  add column if not exists pdf_unificada_url text;

alter table public.faturas
  drop constraint if exists faturas_modalidade_faturamento_check;

alter table public.faturas
  add constraint faturas_modalidade_faturamento_check
  check (
    modalidade_faturamento is null
    or modalidade_faturamento in ('INJECAO', 'COMPENSACAO')
  );

comment on column public.clientes.modalidade_faturamento is
  'Define se a cobrança da usina usa energia injetada ou compensada.';

comment on column public.faturas.desconto_real_percentual is
  'Economia real dividida pelo valor de referência completo, incluindo a fatura CEMIG.';
