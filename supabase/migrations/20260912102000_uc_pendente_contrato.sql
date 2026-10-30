-- A UC recém-cadastrada deve existir para permitir a configuração e o envio
-- do contrato, mas só se torna ativa depois que o consumidor assina.
alter table public.unidades_consumidoras
  drop constraint if exists unidades_consumidoras_status_check;

alter table public.unidades_consumidoras
  add constraint unidades_consumidoras_status_check
  check (status in ('ATIVA', 'INATIVA', 'PENDENTE_CONTRATO'));

create index if not exists unidades_consumidoras_cliente_status_idx
  on public.unidades_consumidoras (cliente_id, status);
