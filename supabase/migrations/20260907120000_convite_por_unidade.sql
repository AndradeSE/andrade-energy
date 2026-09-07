alter table public.convites_clientes
  add column if not exists unidade_consumidora_id uuid references public.unidades_consumidoras(id) on delete set null;

create index if not exists convites_clientes_unidade_idx
  on public.convites_clientes (unidade_consumidora_id, created_at desc);

comment on column public.convites_clientes.unidade_consumidora_id is
  'UC cujo contrato e proposta foram revisados para este convite.';

notify pgrst, 'reload schema';
