-- Saldo confirmado na fatura; NULL significa que o documento não o informou.
alter table public.fechamentos add column if not exists saldo_creditos_kwh numeric;
comment on column public.fechamentos.saldo_creditos_kwh is 'Saldo acumulado de créditos informado na conta da UC geradora, em kWh. Não é produção nem energia disponível projetada.';
