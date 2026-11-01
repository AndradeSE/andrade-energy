-- Disabled until the reviewed release has been deployed and approved.
alter table public.contingencia_automacao add column if not exists retorno_automatico boolean not null default false;
alter table public.contingencia_automacao add column if not exists retorno_observacoes integer not null default 0;
alter table public.contingencia_automacao add column if not exists retorno_desde timestamptz;
alter table public.contingencia_automacao add column if not exists retorno_consulta timestamptz;
alter table public.contingencia_automacao add column if not exists retorno_commit text;
alter table public.contingencia_automacao add column if not exists retorno_revisao bigint;
alter table public.contingencia_automacao add column if not exists retorno_resultado text;

create or replace function public.observar_retorno_render(p_servico text,p_saudavel boolean,p_commit text)
returns text language plpgsql security definer set search_path='' as $$
declare c public.contingencia_controle; m public.contingencia_automacao;
  agora timestamptz:=clock_timestamp(); resultado text:='CONFIRMANDO_RECUPERACAO';
begin
  select * into c from public.contingencia_controle where id=true for update;
  select * into m from public.contingencia_automacao where id=true for update;
  if not m.ativa or not m.retorno_automatico then return 'DESATIVADA'; end if;
  if p_servico is null or p_servico is distinct from m.render_service_id then raise exception 'Serviço divergente'; end if;
  if c.executor='RENDER' then return 'PRINCIPAL_ATIVO'; end if;
  if m.retorno_consulta > agora-interval '45 seconds' then return 'AGUARDANDO_INTERVALO'; end if;
  if p_saudavel is distinct from true or p_commit is null or p_commit !~ '^[a-f0-9]{40}$'
      or c.render_reserva_commit_validado is distinct from p_commit or c.render_reserva_validado_em is null then
    update public.contingencia_automacao set retorno_observacoes=0,retorno_desde=null,retorno_consulta=agora,
      retorno_commit=null,retorno_revisao=null,retorno_resultado='PRINCIPAL_NAO_VALIDADO' where id=true;
    return 'PRINCIPAL_NAO_VALIDADO';
  end if;
  if m.retorno_commit is distinct from p_commit or m.retorno_revisao is distinct from c.revisao
      or m.retorno_consulta is null or m.retorno_consulta < agora-interval '3 minutes' then
    m.retorno_observacoes:=0; m.retorno_desde:=agora;
  end if;
  m.retorno_observacoes:=m.retorno_observacoes+1;
  if m.retorno_observacoes>=3 and m.retorno_desde<=agora-interval '120 seconds' then
    if exists(select 1 from public.contingencia_requisicoes)
      or exists(select 1 from public.contingencia_trabalhos where estado in ('EXECUTANDO','REVISAO')) then
      resultado:='AGUARDANDO_OPERACOES';
    else
      update public.contingencia_controle set executor='RENDER',revisao=revisao+1,atualizado_em=agora
        where id=true returning * into c;
      resultado:='RENDER_REATIVADO';
      insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
        values('00000000-0000-4000-8000-000000000001',m.ativado_por,'CONTINGENCIA_RETORNO_AUTOMATICO','contingencia_controle',
          jsonb_build_object('executor','RENDER','revisao',c.revisao,'servico',p_servico,'commit',p_commit,
            'observacoes',m.retorno_observacoes,'desde',m.retorno_desde));
      perform public.avisar_contingencia_automatica('Servidor principal restabelecido',
        'O principal voltou saudável e na versão aprovada. A execução retornou automaticamente após a conferência das operações pendentes.',
        'contingencia-retorno:'||c.revisao);
    end if;
  end if;
  update public.contingencia_automacao set retorno_observacoes=m.retorno_observacoes,retorno_desde=m.retorno_desde,
    retorno_consulta=agora,retorno_commit=p_commit,retorno_revisao=c.revisao,retorno_resultado=resultado where id=true;
  return resultado;
end $$;
revoke all on function public.observar_retorno_render(text,boolean,text) from public,anon,authenticated;
grant execute on function public.observar_retorno_render(text,boolean,text) to service_role;
