-- Escada comercial Andrade Energy.
-- O plano Profissional existente e atualizado no proprio registro para
-- preservar todas as assinaturas e cobrancas que ja o referenciam.

insert into public.planos_geradores (
  nome,
  descricao,
  valor_mensal,
  valor_anual,
  limite_usinas,
  limite_clientes,
  recursos,
  ativo,
  atualizado_em
)
values (
  'Essencial',
  'Operacao digital para pequenos geradores que estao formando a primeira carteira.',
  99.90,
  999.00,
  1,
  100,
  jsonb_build_array(
    'Gestao de usina e unidades consumidoras',
    'Importacao de faturas por PDF',
    'Contratos e assinatura no aplicativo',
    'Faturamento, Pix e boleto',
    'Aplicativos Gerador e Consumidor'
  ),
  true,
  now()
)
on conflict do nothing;

update public.planos_geradores
set
  descricao = 'Gestao completa para geradores com carteira em crescimento.',
  valor_mensal = 199.90,
  valor_anual = 1999.00,
  limite_usinas = 5,
  limite_clientes = 500,
  recursos = jsonb_build_array(
    'Todos os recursos do Essencial',
    'Recebimento automatico de faturas por e-mail',
    'Operacao e rateio de multiplas usinas',
    'Relatorios, propostas e memoria de calculo',
    'Gestao financeira e cobrancas automaticas'
  ),
  ativo = true,
  atualizado_em = now()
where lower(nome) = 'profissional';

insert into public.planos_geradores (
  nome,
  descricao,
  valor_mensal,
  valor_anual,
  limite_usinas,
  limite_clientes,
  recursos,
  ativo,
  atualizado_em
)
values (
  'Escala',
  'Estrutura multiusina para operacoes com grande volume de consumidores.',
  399.90,
  3999.00,
  20,
  2000,
  jsonb_build_array(
    'Todos os recursos do Profissional',
    'Ate 20 usinas e 2.000 consumidores',
    'Gestao multiempresa e identidade personalizada',
    'Monitoramento consolidado da operacao',
    'Prioridade no suporte e implantacao'
  ),
  true,
  now()
)
on conflict do nothing;
