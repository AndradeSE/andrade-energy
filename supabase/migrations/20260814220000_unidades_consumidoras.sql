create table if not exists public.unidades_consumidoras (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  usina_id uuid references public.usinas(id) on delete set null,
  numero text not null,
  tipo text not null default 'CONSUMIDORA',
  titular text,
  distribuidora text not null default 'CEMIG',
  endereco text,
  modalidade_faturamento text not null default 'COMPENSACAO',
  desconto_percentual numeric(5,2) not null default 40,
  status text not null default 'ATIVA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unidades_consumidoras_numero_unique unique (numero),
  constraint unidades_consumidoras_tipo_check
    check (tipo in ('CONSUMIDORA', 'BENEFICIARIA', 'GERADORA')),
  constraint unidades_consumidoras_modalidade_check
    check (modalidade_faturamento in ('INJECAO', 'COMPENSACAO')),
  constraint unidades_consumidoras_desconto_check
    check (desconto_percentual >= 0 and desconto_percentual <= 100),
  constraint unidades_consumidoras_status_check
    check (status in ('ATIVA', 'INATIVA')),
  constraint unidades_consumidoras_vinculo_check
    check (cliente_id is not null or usina_id is not null)
);

create index if not exists unidades_consumidoras_cliente_idx
  on public.unidades_consumidoras (cliente_id);

create index if not exists unidades_consumidoras_usina_idx
  on public.unidades_consumidoras (usina_id);

alter table public.unidades_consumidoras enable row level security;

insert into public.unidades_consumidoras (
  cliente_id,
  usina_id,
  numero,
  tipo,
  titular,
  distribuidora,
  endereco,
  modalidade_faturamento,
  desconto_percentual,
  status
)
select
  c.id,
  c.usina_id,
  regexp_replace(c.uc, '\D', '', 'g'),
  'BENEFICIARIA',
  c.nome,
  coalesce(c.distribuidora, 'CEMIG'),
  c.endereco,
  coalesce(c.modalidade_faturamento, 'COMPENSACAO'),
  coalesce(c.desconto_percentual, 40),
  case when coalesce(c.status, 'ATIVO') in ('ATIVO', 'ATIVA') then 'ATIVA' else 'INATIVA' end
from public.clientes c
where nullif(regexp_replace(coalesce(c.uc, ''), '\D', '', 'g'), '') is not null
on conflict (numero) do update set
  cliente_id = coalesce(unidades_consumidoras.cliente_id, excluded.cliente_id),
  usina_id = coalesce(unidades_consumidoras.usina_id, excluded.usina_id),
  updated_at = now();

insert into public.unidades_consumidoras (
  usina_id,
  numero,
  tipo,
  titular,
  distribuidora,
  modalidade_faturamento,
  desconto_percentual
)
select
  u.id,
  regexp_replace(u.numero_instalacao, '\D', '', 'g'),
  'GERADORA',
  u.nome,
  coalesce(u.distribuidora, 'CEMIG'),
  'INJECAO',
  40
from public.usinas u
where nullif(regexp_replace(coalesce(u.numero_instalacao, ''), '\D', '', 'g'), '') is not null
on conflict (numero) do update set
  usina_id = excluded.usina_id,
  tipo = 'GERADORA',
  updated_at = now();

alter table public.faturas
  add column if not exists unidade_consumidora_id uuid
  references public.unidades_consumidoras(id) on delete set null;

update public.faturas f
set unidade_consumidora_id = uc.id
from public.unidades_consumidoras uc
where f.unidade_consumidora_id is null
  and regexp_replace(coalesce(f.numero_instalacao, ''), '\D', '', 'g') = uc.numero;

create index if not exists faturas_unidade_consumidora_idx
  on public.faturas (unidade_consumidora_id);
