-- O plano anual custa 95% de doze mensalidades (5% de desconto).
update public.planos_geradores
set
  valor_anual = round((valor_mensal * 12 * 0.95)::numeric, 2),
  atualizado_em = now()
where lower(nome) in ('essencial', 'profissional', 'escala');
