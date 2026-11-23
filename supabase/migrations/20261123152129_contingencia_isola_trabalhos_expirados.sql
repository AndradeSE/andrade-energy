-- Isolate expired jobs during a confirmed billing failover. Their names remain fenced by REVISAO.
CREATE OR REPLACE FUNCTION public.observar_render_reserva_contingencia(p_servico text, p_estado text, p_commit text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare controle public.contingencia_controle; monitor public.contingencia_automacao; agora timestamptz:=clock_timestamp(); resultado text; trabalhos_em_revisao text[];
begin
  if p_servico is null or p_estado is null or p_estado not in ('ATIVO','BILLING','OUTRA_SUSPENSAO','INDETERMINADO') then raise exception 'Observação inválida'; end if;
  select * into controle from public.contingencia_controle where id=true for update;
  select * into monitor from public.contingencia_automacao where id=true for update;
  if controle.reserva_preferida<>'RENDER_RESERVA' then return 'DESTINO_DIVERGENTE'; end if;
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
    elsif p_commit is null or controle.render_reserva_commit_validado is distinct from p_commit or controle.render_reserva_validado_em is null then resultado:='VERSAO_NAO_VALIDADA';
    elsif exists(select 1 from public.contingencia_requisicoes) or exists(select 1 from public.contingencia_trabalhos where estado='EXECUTANDO' and lease_ate>agora) then
      resultado:='AGUARDANDO_OPERACOES';
      perform public.avisar_contingencia_automatica('Servidor reserva: conferência necessária',
        'O Render confirmou suspensão por cobrança, mas existem requisições abertas ou tarefas com prazo de execução vigente. A troca automática foi bloqueada para evitar duplicações.',
        'contingencia-auto-bloqueada:'||controle.revisao);
    else
      -- The control row is locked, so new job reservations cannot begin until the switch commits.
      update public.contingencia_trabalhos
        set estado='REVISAO',atualizado_em=agora
        where estado='EXECUTANDO' and lease_ate<=agora;
      select array_agg(nome order by nome) into trabalhos_em_revisao
        from public.contingencia_trabalhos where estado='REVISAO';
      update public.contingencia_controle set executor='RENDER_RESERVA',revisao=revisao+1,atualizado_em=agora where id=true returning * into controle;
      resultado:='RENDER_RESERVA_ATIVADA';
      insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
        values('00000000-0000-4000-8000-000000000001',monitor.ativado_por,'CONTINGENCIA_TROCA_AUTOMATICA','contingencia_controle',
          jsonb_build_object('executor','RENDER_RESERVA','revisao',controle.revisao,'servico',p_servico,'motivo','billing','fonte','api.render.com',
            'observacoes',monitor.observacoes_billing,'desde',monitor.billing_desde,'commit_validado',p_commit,
            'trabalhos_em_revisao',coalesce(trabalhos_em_revisao,array[]::text[])));
      if trabalhos_em_revisao is not null then
        perform public.avisar_contingencia_automatica('Tarefas em revisão após troca de servidor',
          'O reserva assumiu. As tarefas abaixo continuam pausadas até conferência: '||array_to_string(trabalhos_em_revisao,', '),
          'contingencia-auto-revisao:'||controle.revisao);
      end if;
      perform public.avisar_contingencia_automatica('Servidor reserva ativado automaticamente',
        'O Render reserva assumiu o processamento após o Render confirmar suspensão por cobrança em consultas consecutivas. O retorno ao Render depende de confirmação do ADM.',
        'contingencia-auto-ativada:'||controle.revisao);
    end if;
  end if;
  update public.contingencia_automacao set ultimo_estado=p_estado,ultima_consulta=agora,billing_desde=monitor.billing_desde,
    observacoes_billing=monitor.observacoes_billing,ultimo_resultado=resultado,atualizado_em=agora where id=true;
  return resultado;
end $function$;
