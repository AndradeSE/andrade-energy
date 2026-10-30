-- Gestão comercial das contas geradoras (SaaS), separada das faturas de energia.
create table if not exists public.planos_geradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  valor_mensal numeric(12,2) not null check (valor_mensal >= 0),
  valor_anual numeric(12,2) not null check (valor_anual >= 0),
  limite_usinas integer check (limite_usinas is null or limite_usinas > 0),
  limite_clientes integer check (limite_clientes is null or limite_clientes > 0),
  recursos jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.assinaturas_geradores (
  id uuid primary key default gen_random_uuid(),
  gerador_id uuid not null references public.usuarios(id) on delete restrict,
  plano_id uuid not null references public.planos_geradores(id) on delete restrict,
  ciclo text not null check (ciclo in ('MENSAL','ANUAL')),
  status text not null default 'TESTE' check (status in ('TESTE','ATIVA','INADIMPLENTE','SUSPENSA','CANCELADA')),
  forma_pagamento text not null default 'BOLETO' check (forma_pagamento in ('BOLETO','PIX','CREDIT_CARD','UNDEFINED')),
  valor_contratado numeric(12,2) not null check (valor_contratado >= 0),
  inicio_em date not null default current_date,
  proximo_vencimento date,
  fim_teste_em date,
  cancelada_em timestamptz,
  asaas_customer_id text,
  asaas_subscription_id text,
  observacoes text,
  criado_por uuid references public.usuarios(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists assinaturas_geradores_uma_corrente_idx
  on public.assinaturas_geradores (gerador_id)
  where status in ('TESTE','ATIVA','INADIMPLENTE','SUSPENSA');

create table if not exists public.cobrancas_assinaturas_geradores (
  id uuid primary key default gen_random_uuid(),
  assinatura_id uuid not null references public.assinaturas_geradores(id) on delete restrict,
  competencia text not null,
  vencimento date not null,
  valor numeric(12,2) not null check (valor >= 0),
  status text not null default 'PENDENTE' check (status in ('PENDENTE','VENCIDA','PAGA','CANCELADA','ESTORNADA')),
  asaas_payment_id text,
  invoice_url text,
  bank_slip_url text,
  pix_payload text,
  linha_digitavel text,
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (assinatura_id, competencia)
);

create table if not exists public.documentos_comerciais (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('CONTRATO_SAAS','TERMOS_USO','POLITICA_PRIVACIDADE','POLITICA_CANCELAMENTO')),
  titulo text not null,
  versao text not null,
  conteudo text not null,
  publicado_em timestamptz,
  ativo boolean not null default false,
  criado_por uuid references public.usuarios(id),
  criado_em timestamptz not null default now(),
  unique (tipo, versao)
);

create table if not exists public.aceites_documentos_comerciais (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos_comerciais(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  assinatura_id uuid references public.assinaturas_geradores(id) on delete set null,
  ip text,
  user_agent text,
  aceito_em timestamptz not null default now(),
  unique (documento_id, usuario_id)
);

alter table public.planos_geradores enable row level security;
alter table public.assinaturas_geradores enable row level security;
alter table public.cobrancas_assinaturas_geradores enable row level security;
alter table public.documentos_comerciais enable row level security;
alter table public.aceites_documentos_comerciais enable row level security;

insert into public.planos_geradores (nome, descricao, valor_mensal, valor_anual, limite_usinas, limite_clientes, recursos)
select 'Profissional', 'Gestão completa para geradores de energia', 149.90, 1499.00, 5, 500,
  '["Gestão de usinas e UCs","Faturamento e carteira","Importação automática por e-mail","Relatórios e contratos"]'::jsonb
where not exists (select 1 from public.planos_geradores where nome = 'Profissional');

insert into public.documentos_comerciais (tipo, titulo, versao, conteudo, ativo, publicado_em)
values
('TERMOS_USO','Termos de Uso da Plataforma Andrade Energy','1.0','O acesso à plataforma é pessoal e intransferível. O contratante é responsável pela exatidão dos dados cadastrados, pelo uso de suas credenciais e pelo pagamento do plano contratado. Funcionalidades, limites, suporte, disponibilidade, suspensão e cancelamento seguem o contrato comercial aplicável. Este texto deve ser revisado juridicamente antes da comercialização.',true,now()),
('POLITICA_PRIVACIDADE','Política de Privacidade','1.0','Os dados pessoais são tratados para autenticação, execução dos serviços, faturamento, suporte, segurança e cumprimento de obrigações legais. O titular poderá solicitar informações, correção e demais direitos aplicáveis pelos canais oficiais. Este texto deve ser revisado e complementado por responsável jurídico e encarregado de dados antes da comercialização.',true,now()),
('POLITICA_CANCELAMENTO','Política de Cancelamento','1.0','O cancelamento interrompe renovações futuras conforme as condições do plano e do contrato, sem apagar imediatamente registros fiscais, financeiros, contratuais ou de segurança sujeitos a retenção legal. Este texto deve ser revisado juridicamente antes da comercialização.',true,now()),
('CONTRATO_SAAS','Contrato de Licença e Prestação de Serviços SaaS','1.0','Instrumento-base para licenciamento da plataforma Andrade Energy, contemplando objeto, plano, preço, vigência, cobrança, reajuste, suporte, níveis de serviço, propriedade intelectual, proteção de dados, confidencialidade, suspensão, rescisão, responsabilidade e foro. A versão definitiva deve ser elaborada ou aprovada por advogado.',true,now())
on conflict (tipo, versao) do nothing;
