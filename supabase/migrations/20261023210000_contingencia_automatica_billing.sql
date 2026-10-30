create table if not exists public.contingencia_automacao (
  id boolean primary key default true check(id),
  ativa boolean not null default false,
  render_service_id text check(render_service_id in ('srv-das0mmfpn0mc73ec00hg','srv-da0iso5bedkc73asecig')),
  ativado_por uuid references public.usuarios(id),
  ultimo_estado text,
  ultima_consulta timestamptz,
  billing_desde timestamptz,
  observacoes_billing integer not null default 0,
  ultimo_resultado text,
  atualizado_em timestamptz not null default now(),
  check(not ativa or (render_service_id is not null and ativado_por is not null))
);
insert into public.contingencia_automacao(id) values(true) on conflict do nothing;
alter table public.contingencia_automacao enable row level security;
revoke all on public.contingencia_automacao from public,anon,authenticated;
grant select on public.contingencia_automacao to service_role;

create or replace function public.configurar_contingencia_automatica(p_usuario uuid,p_ativa boolean,p_servico text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_ativa is null or p_servico is null or p_servico not in ('srv-das0mmfpn0mc73ec00hg','srv-da0iso5bedkc73asecig') then raise exception 'Configuração inválida'; end if;
  if not exists(select 1 from public.usuarios u join public.empresa_usuarios v on v.usuario_id=u.id
    where u.id=p_usuario and u.ativo and u.perfil='ADMIN' and u.empresa_id='00000000-0000-4000-8000-000000000001'
      and v.empresa_id=u.empresa_id and v.ativo and v.papel in ('SUPERADMIN','ADMIN_EMPRESA')) then raise exception 'Acesso exclusivo de ADM'; end if;
  update public.contingencia_automacao set ativa=p_ativa,render_service_id=p_servico,ativado_por=p_usuario,
    billing_desde=null,observacoes_billing=0,ultimo_estado=null,ultima_consulta=null,ultimo_resultado=null,atualizado_em=clock_timestamp() where id=true;
  insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
    values('00000000-0000-4000-8000-000000000001',p_usuario,'CONTINGENCIA_AUTOMACAO_CONFIGURADA','contingencia_automacao',
      jsonb_build_object('ativa',p_ativa,'servico',p_servico,'criterio','suspensao_billing_confirmada_api_render','retorno','manual'));
end $$;

create or replace function public.avisar_contingencia_automatica(p_titulo text,p_detalhe text,p_chave text)
returns void language plpgsql security definer set search_path='' as $$
declare membro record;
begin
  for membro in select distinct u.id from public.usuarios u join public.empresa_usuarios v on v.usuario_id=u.id
    where u.ativo and u.perfil='ADMIN' and u.empresa_id='00000000-0000-4000-8000-000000000001'
      and v.empresa_id=u.empresa_id and v.ativo and v.papel in ('SUPERADMIN','ADMIN_EMPRESA')
  loop
    perform public.criar_notificacao_com_push(jsonb_build_object('usuario_id',membro.id,'empresa_id','00000000-0000-4000-8000-000000000001',
      'tipo','CONTINGENCIA','titulo',p_titulo,'detalhe',p_detalhe,'rota','/cotas-servicos','chave_dedupe',p_chave||':'||membro.id));
  end loop;
end $$;

-- Private RPC for the independent Netlify observer. Never infers billing from a timeout or a 503.
create or replace function public.observar_render_contingencia(p_servico text,p_estado text,p_commit text)
returns text language plpgsql security definer set search_path='' as $$
declare controle public.contingencia_controle; monitor public.contingencia_automacao; agora timestamptz:=clock_timestamp(); resultado text;
begin
  if p_servico is null or p_estado is null or p_estado not in ('ATIVO','BILLING','OUTRA_SUSPENSAO','INDETERMINADO') then raise exception 'Observação inválida'; end if;
  select * into controle from public.contingencia_controle where id=true for update;
  select * into monitor from public.contingencia_automacao where id=true for update;
  if not monitor.ativa then return 'DESATIVADA'; end if;
  if p_servico is distinct from monitor.render_service_id then raise exception 'Serviço divergente'; end if;
  if monitor.ultima_consulta > agora-interval '45 seconds' then return 'AGUARDANDO_INTERVALO'; end if;
  if p_estado='BILLING' and monitor.ultimo_estado='BILLING' and monitor.ultima_consulta>=agora-interval '5 minutes' then
    monitor.observacoes_billing:=monitor.observacoes_billing+1;
  elsif p_estado='BILLING' then
    monitor.observacoes_billing:=1; monitor.billing_desde:=agora;
  else
    monitor.observacoes_billing:=0; monitor.billing_desde:=null;
  end if;
  resultado:='OBSERVADO';
  if controle.executor='RENDER' and p_estado='BILLING' then
    if monitor.observacoes_billing<2 or monitor.billing_desde>agora-interval '60 seconds' then resultado:='CONFIRMANDO_BILLING';
    elsif p_commit is null or controle.commit_validado is distinct from p_commit or controle.validado_em is null then resultado:='VERSAO_NAO_VALIDADA';
    elsif exists(select 1 from public.contingencia_requisicoes) or exists(select 1 from public.contingencia_trabalhos where estado in ('EXECUTANDO','REVISAO')) then
      resultado:='AGUARDANDO_OPERACOES';
      perform public.avisar_contingencia_automatica('Servidor reserva: conferência necessária',
        'O Render confirmou suspensão por cobrança, mas existem operações em execução ou pendentes de revisão. A troca automática foi bloqueada para evitar duplicações.',
        'contingencia-auto-bloqueada:'||controle.revisao);
    else
      update public.contingencia_controle set executor='NETLIFY',revisao=revisao+1,atualizado_em=agora where id=true returning * into controle;
      resultado:='NETLIFY_ATIVADA';
      insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
        values('00000000-0000-4000-8000-000000000001',monitor.ativado_por,'CONTINGENCIA_TROCA_AUTOMATICA','contingencia_controle',
          jsonb_build_object('executor','NETLIFY','revisao',controle.revisao,'servico',p_servico,'motivo','billing','fonte','api.render.com',
            'observacoes',monitor.observacoes_billing,'desde',monitor.billing_desde,'commit_validado',p_commit));
      perform public.avisar_contingencia_automatica('Servidor reserva ativado automaticamente',
        'A Netlify assumiu o processamento após o Render confirmar suspensão por cobrança em consultas consecutivas. O retorno ao Render depende de confirmação do ADM.',
        'contingencia-auto-ativada:'||controle.revisao);
    end if;
  end if;
  update public.contingencia_automacao set ultimo_estado=p_estado,ultima_consulta=agora,billing_desde=monitor.billing_desde,
    observacoes_billing=monitor.observacoes_billing,ultimo_resultado=resultado,atualizado_em=agora where id=true;
  return resultado;
end $$;
revoke all on function public.configurar_contingencia_automatica(uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.avisar_contingencia_automatica(text,text,text) from public,anon,authenticated;
revoke all on function public.observar_render_contingencia(text,text,text) from public,anon,authenticated;
grant execute on function public.configurar_contingencia_automatica(uuid,boolean,text) to service_role;
grant execute on function public.observar_render_contingencia(text,text,text) to service_role;
