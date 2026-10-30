create table if not exists public.integracoes_inversores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usina_id uuid not null references public.usinas(id) on delete cascade,
  provedor text not null default 'PHB_SOLARPORTAL_PLUS'
    check (provedor in ('PHB_SOLARPORTAL_PLUS', 'HUAWEI_FUSIONSOLAR', 'FRONIUS_SOLARWEB', 'INTELBRAS', 'GROWATT')),
  numero_serie text not null,
  modelo text,
  potencia_nominal_kw numeric(12,3),
  firmware text,
  status text not null default 'AGUARDANDO_AUTORIZACAO'
    check (status in ('AGUARDANDO_AUTORIZACAO', 'ATIVA', 'ERRO', 'DESATIVADA')),
  ultima_sincronizacao_em timestamptz,
  ultimo_erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, numero_serie)
);

create index if not exists integracoes_inversores_usina_idx
  on public.integracoes_inversores (usina_id, criado_em);

alter table public.integracoes_inversores enable row level security;

comment on table public.integracoes_inversores is
  'Equipamentos de monitoramento vinculados individualmente a uma usina. Credenciais oficiais permanecem somente no backend.';

comment on column public.integracoes_inversores.numero_serie is
  'Número de série único do inversor ou datalogger dentro da empresa.';
