-- Separate identity for Render reserve. This migration never activates it.
alter table public.contingencia_controle add column if not exists render_reserva_commit_validado text;
alter table public.contingencia_controle add column if not exists render_reserva_validado_em timestamptz;
alter table public.contingencia_controle drop constraint if exists contingencia_controle_executor_check;
alter table public.contingencia_controle add constraint contingencia_controle_executor_check check (executor in ('RENDER','NETLIFY','RENDER_RESERVA'));
alter table public.contingencia_requisicoes drop constraint if exists contingencia_requisicoes_executor_check;
alter table public.contingencia_requisicoes add constraint contingencia_requisicoes_executor_check check (executor in ('RENDER','NETLIFY','RENDER_RESERVA'));
alter table public.contingencia_trabalhos drop constraint if exists contingencia_trabalhos_executor_check;
alter table public.contingencia_trabalhos add constraint contingencia_trabalhos_executor_check check (executor in ('RENDER','NETLIFY','RENDER_RESERVA'));

create or replace function public.iniciar_requisicao_contingencia(p_id uuid,p_executor text,p_namespace text,p_commit text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare alvo text; validado text;
begin
  if p_id is null or p_executor not in ('RENDER','NETLIFY','RENDER_RESERVA') or p_namespace !~ '^/[a-z-]{1,40}$' then
    raise exception 'Requisição inválida';
  end if;
  select executor,case when p_executor='RENDER_RESERVA' then render_reserva_commit_validado else commit_validado end into alvo,validado from public.contingencia_controle where id=true for share;
  if alvo is distinct from p_executor then return false; end if;
  if p_executor in ('NETLIFY','RENDER_RESERVA') and (validado is null or validado is distinct from p_commit) then return false; end if;
  insert into public.contingencia_requisicoes(id,executor,namespace) values(p_id,p_executor,p_namespace);
  return true;
end;
$$;

create or replace function public.trocar_executor_contingencia(p_usuario uuid,p_executor text,p_revisao bigint,p_confirmacao text)
returns bigint language plpgsql security definer set search_path='' as $$
declare atual public.contingencia_controle;
begin
  if not exists(select 1 from public.usuarios u join public.empresa_usuarios v on v.usuario_id=u.id
    where u.id=p_usuario and u.ativo and u.perfil='ADMIN' and u.empresa_id='00000000-0000-4000-8000-000000000001'
    and v.empresa_id=u.empresa_id and v.ativo and v.papel in ('SUPERADMIN','ADMIN_EMPRESA')) then
    raise exception 'Acesso exclusivo de ADM';
  end if;
  select * into atual from public.contingencia_controle where id=true for update;
  if p_executor not in ('RENDER','NETLIFY','RENDER_RESERVA') or p_revisao is distinct from atual.revisao then raise exception 'Controle alterado; atualize a conferência'; end if;
  if p_executor=atual.executor then return atual.revisao; end if;
  if p_executor='NETLIFY' and (p_confirmacao is distinct from 'COTA_RENDER_ESGOTADA' or atual.commit_validado is null or atual.validado_em is null) then
    raise exception 'Confirme a cota esgotada e valide o reserva';
  end if;
  if p_executor='RENDER_RESERVA' and (p_confirmacao is distinct from 'COTA_RENDER_ESGOTADA'
    or atual.render_reserva_commit_validado is null or atual.render_reserva_validado_em is null) then
    raise exception 'Valide a versão do reserva Render e confirme o motivo da troca';
  end if;
  if p_executor='RENDER' and p_confirmacao is distinct from 'RENDER_RECUPERADO' then raise exception 'Confirme a recuperação'; end if;
  if exists(select 1 from public.contingencia_requisicoes) or
    exists(select 1 from public.contingencia_trabalhos where estado in ('EXECUTANDO','REVISAO')) then
    raise exception 'Há operações em execução ou com resultado pendente de conferência';
  end if;
  update public.contingencia_controle set executor=p_executor,revisao=revisao+1,atualizado_em=clock_timestamp() where id=true returning * into atual;
  insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
    values('00000000-0000-4000-8000-000000000001',p_usuario,'CONTINGENCIA_TROCA_EXECUTOR','contingencia_controle',
      jsonb_build_object('executor',p_executor,'revisao',atual.revisao,'confirmacao',p_confirmacao,'commit_validado',atual.commit_validado));
  return atual.revisao;
end;
$$;

create or replace function public.reservar_trabalho_contingencia(p_nome text,p_executor text,p_dono uuid,p_intervalo integer,p_commit text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare alvo text; validado text; trabalho public.contingencia_trabalhos;
begin
  if p_nome not in ('PUSH','COTAS','AVISOS_CONTRATOS','AVISOS_FATURAS','RATEIOS','CONVITES','PRODUCAO_EMAIL','FATURAS_EMAIL','NOTIFICACOES_FATURA')
    or p_executor not in ('RENDER','NETLIFY','RENDER_RESERVA') or p_dono is null or p_intervalo not between 30 and 86400 then
    raise exception 'Trabalho inválido';
  end if;
  select executor,case when p_executor='RENDER_RESERVA' then render_reserva_commit_validado else commit_validado end into alvo,validado from public.contingencia_controle where id=true for share;
  if alvo is distinct from p_executor then return false; end if;
  if p_executor in ('NETLIFY','RENDER_RESERVA') and (validado is null or validado is distinct from p_commit) then return false; end if;
  -- Serialize the absent-row case as well as subsequent reservations.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('contingencia:'||p_nome,0));
  select * into trabalho from public.contingencia_trabalhos where nome=p_nome for update;
  if found then
    if trabalho.estado='REVISAO' then return false; end if;
    if trabalho.estado='EXECUTANDO' then
      if trabalho.lease_ate>clock_timestamp() then return false; end if;
      if p_nome not in ('PUSH','COTAS') then
        update public.contingencia_trabalhos set estado='REVISAO',atualizado_em=clock_timestamp() where nome=p_nome;
        return false;
      end if;
    elsif trabalho.proxima_execucao>clock_timestamp() then return false;
    end if;
  end if;
  insert into public.contingencia_trabalhos(nome,estado,executor,dono,lease_ate,proxima_execucao)
    values(p_nome,'EXECUTANDO',p_executor,p_dono,clock_timestamp()+interval '18 minutes',clock_timestamp()+p_intervalo*interval '1 second')
    on conflict(nome) do update set estado=excluded.estado,executor=excluded.executor,dono=excluded.dono,
      lease_ate=excluded.lease_ate,proxima_execucao=excluded.proxima_execucao,atualizado_em=clock_timestamp();
  return true;
end;
$$;
