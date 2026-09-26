-- Dados públicos mínimos para um banco de homologação vazio.
-- Execute APENAS no projeto qqhcjieymypowunkixmk, nunca em produção.
-- Idempotente: não altera clientes, contratos, usuários nem pagamentos.

insert into public.empresas (
  id, slug, nome, razao_social, empresa_proprietaria,
  identidade_personalizada, cor_primaria, cor_secundaria, ativo
)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  'andrade-energy', 'Andrade Energy Homologação',
  'Andrade Energy Homologação', true, true, '#087A46', '#F7D75C', true
where not exists (
  select 1 from public.empresas
  where id = '00000000-0000-4000-8000-000000000001'::uuid
     or slug = 'andrade-energy'
);

insert into public.planos_geradores (
  nome, descricao, valor_mensal, valor_anual,
  limite_usinas, limite_clientes, recursos, ativo
)
select plano.nome, plano.descricao, plano.valor_mensal, plano.valor_anual,
       plano.limite_usinas, plano.limite_clientes, plano.recursos, true
from (values
  ('Essencial', 'Operação digital para pequenos geradores.', 99.90::numeric, 999.00::numeric, 1, 100,
   '["Gestão de usina e unidades consumidoras","Importação de faturas por PDF","Contratos e assinatura no aplicativo","Faturamento, Pix e boleto","Aplicativos Gerador e Consumidor"]'::jsonb),
  ('Profissional', 'Gestão completa para geradores com carteira em crescimento.', 199.90::numeric, 1999.00::numeric, 5, 500,
   '["Todos os recursos do Essencial","Recebimento automático de faturas por e-mail","Operação e rateio de múltiplas usinas","Relatórios, propostas e memória de cálculo","Gestão financeira e cobranças automáticas"]'::jsonb),
  ('Escala', 'Estrutura multiusina para operações com grande volume de consumidores.', 399.90::numeric, 3999.00::numeric, 20, 2000,
   '["Todos os recursos do Profissional","Até 20 usinas e 2.000 consumidores","Gestão multiempresa e identidade personalizada","Monitoramento consolidado da operação","Prioridade no suporte e implantação"]'::jsonb)
) as plano(nome, descricao, valor_mensal, valor_anual, limite_usinas, limite_clientes, recursos)
where not exists (
  select 1 from public.planos_geradores existing
  where lower(existing.nome) = lower(plano.nome)
);

select (select count(*) from public.empresas where slug = 'andrade-energy') as empresas,
       (select count(*) from public.planos_geradores where ativo) as planos_ativos;
