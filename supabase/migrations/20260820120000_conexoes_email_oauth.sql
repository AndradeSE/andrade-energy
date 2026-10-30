-- Conexões OAuth de caixas de e-mail de clientes.
-- Os refresh tokens nunca são expostos ao aplicativo: ficam cifrados pelo backend.

create table if not exists public.conexoes_email (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  unidade_consumidora_id uuid not null references public.unidades_consumidoras(id) on delete cascade,
  provedor text not null,
  email_conectado text,
  refresh_token_criptografado text not null,
  token_acesso_expira_em timestamptz,
  escopos jsonb not null default '[]'::jsonb,
  status text not null,
  regra_id text,
  regra_status text not null default 'NAO_APLICAVEL',
  regra_erro text,
  conectado_em timestamptz not null default now(),
  ultima_validacao_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conexoes_email_provedor_check
    check (provedor in ('OUTLOOK', 'GMAIL')),
  constraint conexoes_email_status_check
    check (status in ('REGRA_ATIVA', 'CONECTADO_SEM_REGRA', 'LEITURA_AUTORIZADA', 'ERRO', 'REVOGADA')),
  constraint conexoes_email_regra_status_check
    check (regra_status in ('ATIVA', 'NAO_CONFIGURADA', 'NAO_APLICAVEL', 'ERRO', 'REMOVIDA')),
  constraint conexoes_email_unidade_provedor_key
    unique (unidade_consumidora_id, provedor)
);

create index if not exists conexoes_email_usuario_idx
  on public.conexoes_email (usuario_id, updated_at desc);

create index if not exists conexoes_email_unidade_idx
  on public.conexoes_email (unidade_consumidora_id, updated_at desc);

alter table public.conexoes_email enable row level security;

-- Estados de autorização de curta duração. Apenas o hash do state é persistido;
-- o state puro circula somente entre o backend, o provedor e o retorno ao app.
create table if not exists public.oauth_email_estados (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  unidade_consumidora_id uuid not null references public.unidades_consumidoras(id) on delete cascade,
  provedor text not null,
  app text not null,
  pkce_verifier text not null,
  callback_url text not null,
  status text not null default 'PENDENTE',
  conexao_email_id uuid references public.conexoes_email(id) on delete set null,
  erro text,
  autorizado_em timestamptz,
  consumido_em timestamptz,
  expira_em timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oauth_email_estados_provedor_check
    check (provedor in ('OUTLOOK', 'GMAIL')),
  constraint oauth_email_estados_app_check
    check (app in ('CONSUMIDOR', 'GERADOR')),
  constraint oauth_email_estados_status_check
    check (status in ('PENDENTE', 'AUTORIZADO', 'ERRO', 'EXPIRADO', 'CONCLUIDO'))
);

create index if not exists oauth_email_estados_usuario_idx
  on public.oauth_email_estados (usuario_id, created_at desc);

create index if not exists oauth_email_estados_expiracao_idx
  on public.oauth_email_estados (status, expira_em);

alter table public.oauth_email_estados enable row level security;

comment on table public.conexoes_email is
  'Conexões OAuth de e-mail. refresh_token_criptografado usa AES-256-GCM no backend.';

comment on table public.oauth_email_estados is
  'Estados OAuth de uso único com PKCE. Não armazena o state original.';
