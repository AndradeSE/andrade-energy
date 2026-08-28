-- Andrade Energy continua sendo a empresa proprietária e o padrão visual.
-- Empresas parceiras operam de forma isolada dentro do mesmo ecossistema.

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  razao_social text,
  documento text,
  logo_url text,
  cor_primaria text not null default '#087A46',
  cor_secundaria text not null default '#F7D75C',
  email_suporte text,
  telefone_suporte text,
  dominio text,
  empresa_proprietaria boolean not null default false,
  identidade_personalizada boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint empresas_cor_primaria_check check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  constraint empresas_cor_secundaria_check check (cor_secundaria ~ '^#[0-9A-Fa-f]{6}$')
);

drop index if exists public.usuarios_admin_ativo_unico_idx;

insert into public.empresas (
  id, slug, nome, razao_social, empresa_proprietaria,
  identidade_personalizada, cor_primaria, cor_secundaria, ativo
) values (
  '00000000-0000-4000-8000-000000000001',
  'andrade-energy',
  'Andrade Energy',
  'Andrade Energy',
  true,
  true,
  '#087A46',
  '#F7D75C',
  true
)
on conflict (slug) do update set
  empresa_proprietaria = true,
  atualizado_em = now();

alter table public.usuarios
  add column if not exists empresa_id uuid references public.empresas(id) on delete restrict;

update public.usuarios
set empresa_id = '00000000-0000-4000-8000-000000000001'
where empresa_id is null;

alter table public.usuarios
  alter column empresa_id set default '00000000-0000-4000-8000-000000000001',
  alter column empresa_id set not null;

create table if not exists public.empresa_usuarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  papel text not null default 'LEITURA'
    check (papel in ('SUPERADMIN', 'ADMIN_EMPRESA', 'GESTOR', 'LEITURA')),
  principal boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, usuario_id)
);

insert into public.empresa_usuarios (empresa_id, usuario_id, papel, principal, ativo)
select
  u.empresa_id,
  u.id,
  case
    when u.perfil = 'ADMIN' then 'SUPERADMIN'
    when u.perfil = 'GESTOR' then 'ADMIN_EMPRESA'
    else 'LEITURA'
  end,
  true,
  coalesce(u.ativo, true)
from public.usuarios u
on conflict (empresa_id, usuario_id) do update set
  papel = excluded.papel,
  principal = true,
  ativo = excluded.ativo,
  atualizado_em = now();

-- Tabelas operacionais isoladas por empresa. O bloco é idempotente e tolera
-- instalações em que algum módulo opcional ainda não tenha sido criado.
do $$
declare
  tabela text;
  tabelas text[] := array[
    'usinas', 'clientes', 'unidades_consumidoras', 'faturas', 'contratos',
    'creditos', 'creditos_cliente', 'debitos_fatura', 'cobrancas',
    'fechamentos', 'historico_consumo', 'participacoes_usina', 'rateios',
    'notificacoes_fatura', 'convites_clientes', 'convites_geradores',
    'recebimentos_faturas_email', 'conexoes_email', 'oauth_email_estados',
    'gerador_carteiras', 'asaas_cobrancas', 'asaas_transferencias'
  ];
begin
  foreach tabela in array tabelas loop
    if to_regclass('public.' || tabela) is not null then
      execute format(
        'alter table public.%I add column if not exists empresa_id uuid references public.empresas(id) on delete restrict',
        tabela
      );
      execute format(
        'update public.%I set empresa_id = %L::uuid where empresa_id is null',
        tabela,
        '00000000-0000-4000-8000-000000000001'
      );
      execute format(
        'alter table public.%I alter column empresa_id set default %L::uuid',
        tabela,
        '00000000-0000-4000-8000-000000000001'
      );
      execute format(
        'alter table public.%I alter column empresa_id set not null',
        tabela
      );
      execute format(
        'create index if not exists %I on public.%I (empresa_id)',
        tabela || '_empresa_id_idx',
        tabela
      );
    end if;
  end loop;
end $$;

create index if not exists usuarios_empresa_id_idx on public.usuarios(empresa_id);
create index if not exists empresa_usuarios_usuario_id_idx on public.empresa_usuarios(usuario_id);

alter table public.empresas enable row level security;
alter table public.empresa_usuarios enable row level security;

comment on table public.empresas is
  'Empresas parceiras do ecossistema Andrade Energy; a identidade Andrade Energy permanece como padrão.';
comment on column public.empresas.identidade_personalizada is
  'Quando falso, aplicativos, portal e documentos usam a identidade visual padrão Andrade Energy.';
