-- Cadastro e confirmação financeira antes do convite de acesso ao Gerador.
create table if not exists public.adesoes_assinaturas (
  id uuid primary key default gen_random_uuid(),
  chave_hash text not null unique,
  dados_hash text not null,
  plano_id uuid not null references public.planos_geradores(id),
  ciclo text not null check (ciclo in ('MENSAL','ANUAL')),
  valor numeric(12,2) not null check (valor > 0),
  parcelas integer not null default 1 check (parcelas between 1 and 12),
  nome text not null,
  cpf text not null,
  email text not null,
  telefone text not null,
  endereco text not null,
  documentos jsonb not null,
  ip text,
  user_agent text,
  status text not null default 'CRIANDO' check (status in ('CRIANDO','AGUARDANDO_PAGAMENTO','PAGO','CONVITE_ENVIADO','CONCLUIDO','CANCELADO')),
  provedor text not null check (provedor in ('ASAAS','MERCADO_PAGO')),
  checkout_id text,
  checkout_url text,
  customer_id text,
  subscription_id text,
  pagamento_id text,
  pago_em timestamptz,
  vencimento date,
  convite_id uuid references public.convites_clientes(id),
  convite_token_criptografado text,
  convite_enviado_em timestamptz,
  assinatura_id uuid references public.assinaturas_geradores(id),
  tentativas integer not null default 0,
  ultima_tentativa_em timestamptz,
  erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.adesoes_assinaturas enable row level security;
revoke all on public.adesoes_assinaturas from anon, authenticated;
create index if not exists adesoes_assinaturas_fila_idx on public.adesoes_assinaturas(status, ultima_tentativa_em) where status = 'PAGO';
create unique index if not exists adesoes_assinaturas_checkout_idx on public.adesoes_assinaturas(provedor,checkout_id) where checkout_id is not null;

create or replace function public.preparar_convite_adesao(p_id uuid, p_token_hash text, p_token_criptografado text)
returns public.adesoes_assinaturas language plpgsql security definer set search_path = public as $$
declare a public.adesoes_assinaturas; admin_id uuid; novo_convite_id uuid;
begin
  select * into a from public.adesoes_assinaturas where id = p_id for update;
  if not found or a.status not in ('PAGO','CONVITE_ENVIADO','CONCLUIDO') then raise exception 'Pagamento ainda não confirmado.'; end if;
  if a.convite_id is not null then return a; end if;
  select id into admin_id from public.usuarios where perfil = 'ADMIN' and ativo = true
    and empresa_id = '00000000-0000-4000-8000-000000000001' order by created_at limit 1;
  if admin_id is null then raise exception 'Conta administrativa de envio não configurada.'; end if;
  insert into public.convites_clientes(gestor_id,empresa_id,nome,cpf,email,endereco,plano_id,ciclo_assinatura,dias_teste,token_hash,expira_em)
  values(admin_id,'00000000-0000-4000-8000-000000000001',a.nome,a.cpf,a.email,a.endereco,a.plano_id,a.ciclo,0,p_token_hash,now()+interval '7 days') returning id into novo_convite_id;
  update public.adesoes_assinaturas set convite_id = novo_convite_id,
    convite_token_criptografado = p_token_criptografado, atualizado_em = now() where id = p_id returning * into a;
  return a;
end $$;

create or replace function public.concluir_adesao_assinatura(p_convite_id uuid, p_usuario_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a public.adesoes_assinaturas; u public.usuarios; assinatura uuid; proximo date;
begin
  select * into a from public.adesoes_assinaturas where convite_id = p_convite_id for update;
  if not found then return null; end if;
  if a.status not in ('PAGO','CONVITE_ENVIADO','CONCLUIDO') then raise exception 'Pagamento ainda não confirmado.'; end if;
  select * into u from public.usuarios where id = p_usuario_id;
  if u.id is null or lower(u.email) <> a.email or regexp_replace(u.cpf,'\D','','g') <> a.cpf then raise exception 'Cadastro incompatível com a assinatura.'; end if;
  if a.assinatura_id is not null then return a.assinatura_id; end if;
  proximo := (coalesce(a.vencimento, a.pago_em::date) + case when a.ciclo = 'ANUAL' then interval '1 year' else interval '1 month' end)::date;
  insert into public.assinaturas_geradores(gerador_id,plano_id,ciclo,status,forma_pagamento,valor_contratado,inicio_em,proximo_vencimento,
    observacoes,provedor_pagamento,asaas_checkout_id,asaas_customer_id,asaas_subscription_id,mercado_pago_preapproval_id,parcelas_cartao)
  values(p_usuario_id,a.plano_id,a.ciclo,'ATIVA','CREDIT_CARD',a.valor,a.pago_em::date,proximo,
    'Assinatura contratada pelo site, com pagamento confirmado automaticamente.',a.provedor,
    case when a.provedor='ASAAS' then a.checkout_id end,case when a.provedor='ASAAS' then a.customer_id end,
    case when a.provedor='ASAAS' then a.subscription_id end,case when a.provedor='MERCADO_PAGO' then a.checkout_id end,a.parcelas)
  returning id into assinatura;
  if a.pagamento_id is null or a.pago_em is null then raise exception 'Pagamento não registrado para a assinatura.'; end if;
  insert into public.cobrancas_assinaturas_geradores
    (assinatura_id,competencia,vencimento,valor,status,provedor_pagamento,asaas_payment_id,mercado_pago_payment_id,pago_em)
  values
    (assinatura,to_char(coalesce(a.vencimento,a.pago_em::date),'YYYY-MM'),coalesce(a.vencimento,a.pago_em::date),
     round(a.valor/a.parcelas,2),'PAGA',a.provedor,
     case when a.provedor='ASAAS' then a.pagamento_id end,
     case when a.provedor='MERCADO_PAGO' then a.pagamento_id end,a.pago_em);
  insert into public.aceites_documentos_comerciais(documento_id,usuario_id,assinatura_id,ip,user_agent,aceito_em)
    select (doc->>'id')::uuid,p_usuario_id,assinatura,a.ip,a.user_agent,a.criado_em from jsonb_array_elements(a.documentos) doc
    on conflict(documento_id,usuario_id) do nothing;
  update public.usuarios set telefone = a.telefone where id = p_usuario_id;
  update public.empresas set endereco = a.endereco where id = u.empresa_id;
  if not found then raise exception 'Operação do gerador não encontrada para a assinatura.'; end if;
  update public.convites_clientes set status='ACEITO', aceito_em=now()
    where id=p_convite_id and status='PENDENTE';
  if not found then raise exception 'Convite de assinatura não está pendente.'; end if;
  update public.adesoes_assinaturas set assinatura_id=assinatura,status='CONCLUIDO',atualizado_em=now() where id=a.id;
  return assinatura;
end $$;
revoke all on function public.preparar_convite_adesao(uuid,text,text) from public, anon, authenticated;
revoke all on function public.concluir_adesao_assinatura(uuid,uuid) from public, anon, authenticated;
grant execute on function public.preparar_convite_adesao(uuid,text,text) to service_role;
grant execute on function public.concluir_adesao_assinatura(uuid,uuid) to service_role;
