alter table public.financeiro_autenticadores add column if not exists email_recuperacao text;
-- Freeze the existing recovery address once; profile edits must not move the second factor.
update public.financeiro_autenticadores a set email_recuperacao=u.email from public.usuarios u
where u.id=a.usuario_id and a.email_recuperacao is null;

create table if not exists public.financeiro_recuperacoes (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  id uuid not null unique,
  empresa_id uuid not null references public.empresas(id),
  email text not null,
  senha_snapshot text not null,
  segredo_snapshot text not null,
  codigo_hash text not null check (codigo_hash ~ '^[a-f0-9]{64}$'),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  tentativas integer not null default 0,
  consumido_em timestamptz,
  janela_em timestamptz not null default now(),
  envios integer not null default 1
);
alter table public.financeiro_recuperacoes enable row level security;
revoke all on public.financeiro_recuperacoes from public, anon, authenticated;
grant all on public.financeiro_recuperacoes to service_role;

create or replace function public.iniciar_recuperacao_financeira(p_usuario uuid,p_empresa uuid,p_id uuid,p_email text,p_senha text,p_segredo text,p_hash text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.financeiro_autenticadores; r public.financeiro_recuperacoes; u public.usuarios;
begin
  if p_usuario is null or p_empresa is null or p_id is null or p_email is null or p_senha is null or p_segredo is null or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then return 'INVALIDO'; end if;
  select * into a from public.financeiro_autenticadores where usuario_id=p_usuario for update;
  if not found or not a.confirmado or a.email_recuperacao is distinct from p_email or encode(sha256(convert_to(a.segredo_criptografado,'UTF8')),'hex') is distinct from p_segredo then return 'SEM_AUTENTICADOR'; end if;
  select * into u from public.usuarios where id=p_usuario for share;
  if not found or not u.ativo or u.email is distinct from p_email or encode(sha256(convert_to(u.senha,'UTF8')),'hex') is distinct from p_senha then return 'CONTA_ALTERADA'; end if;
  if not exists(select 1 from public.empresa_usuarios where usuario_id=p_usuario and empresa_id=p_empresa and ativo) then return 'SEM_ACESSO'; end if;
  select * into r from public.financeiro_recuperacoes where usuario_id=p_usuario for update;
  if found then
    if r.criado_em>now()-interval '60 seconds' then return 'AGUARDE'; end if;
    if r.janela_em>now()-interval '24 hours' and r.envios>=5 then return 'LIMITE'; end if;
  end if;
  insert into public.financeiro_recuperacoes(usuario_id,id,empresa_id,email,senha_snapshot,segredo_snapshot,codigo_hash,expira_em,janela_em,envios)
  values(p_usuario,p_id,p_empresa,p_email,p_senha,p_segredo,p_hash,now()+interval '10 minutes',
    case when r.janela_em>now()-interval '24 hours' then r.janela_em else now() end,
    case when r.janela_em>now()-interval '24 hours' then r.envios+1 else 1 end)
  on conflict(usuario_id) do update set id=excluded.id,empresa_id=excluded.empresa_id,email=excluded.email,
    senha_snapshot=excluded.senha_snapshot,segredo_snapshot=excluded.segredo_snapshot,codigo_hash=excluded.codigo_hash,
    criado_em=now(),expira_em=excluded.expira_em,tentativas=0,consumido_em=null,janela_em=excluded.janela_em,envios=excluded.envios;
  insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
    values(p_empresa,p_usuario,'TOTP_RECUPERACAO_SOLICITADA','financeiro_autenticadores',jsonb_build_object('solicitacao',p_id));
  return 'OK';
end $$;

create or replace function public.confirmar_recuperacao_financeira(p_usuario uuid,p_empresa uuid,p_id uuid,p_hash text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.financeiro_autenticadores; r public.financeiro_recuperacoes; u public.usuarios;
begin
  if p_usuario is null or p_empresa is null or p_id is null or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then return 'INVALIDO'; end if;
  select * into a from public.financeiro_autenticadores where usuario_id=p_usuario for update;
  if not found or not a.confirmado then return 'INVALIDO'; end if;
  select * into r from public.financeiro_recuperacoes where usuario_id=p_usuario for update;
  if not found or r.id<>p_id or r.empresa_id<>p_empresa or r.consumido_em is not null or r.expira_em<=now() or r.tentativas>=5 then return 'INVALIDO'; end if;
  select * into u from public.usuarios where id=p_usuario for share;
  if not found or not u.ativo or u.email is distinct from r.email or a.email_recuperacao is distinct from r.email or encode(sha256(convert_to(u.senha,'UTF8')),'hex') is distinct from r.senha_snapshot or encode(sha256(convert_to(a.segredo_criptografado,'UTF8')),'hex') is distinct from r.segredo_snapshot then return 'INVALIDO'; end if;
  if not exists(select 1 from public.empresa_usuarios where usuario_id=p_usuario and empresa_id=p_empresa and ativo) then return 'INVALIDO'; end if;
  if r.codigo_hash<>p_hash then
    update public.financeiro_recuperacoes set tentativas=tentativas+1 where usuario_id=p_usuario;
    return 'INVALIDO';
  end if;
  update public.financeiro_recuperacoes set consumido_em=now() where usuario_id=p_usuario;
  update public.financeiro_autenticadores set confirmado=false,expira_em=now()-interval '1 second',tentativas=0,bloqueado_ate=null,atualizado_em=now() where usuario_id=p_usuario;
  insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
    values(p_empresa,p_usuario,'TOTP_RECUPERACAO_CONFIRMADA','financeiro_autenticadores',jsonb_build_object('solicitacao',p_id,'novo_cadastro_obrigatorio',true));
  return 'OK';
end $$;
revoke all on function public.iniciar_recuperacao_financeira(uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.confirmar_recuperacao_financeira(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.iniciar_recuperacao_financeira(uuid,uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.confirmar_recuperacao_financeira(uuid,uuid,uuid,text) to service_role;
