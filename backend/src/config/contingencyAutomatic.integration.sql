-- Homologation only. All state changes and notification outbox rows are rolled back.
begin;
do $$
declare servico text:='srv-das0mmfpn0mc73ec00hg'; versao text:=repeat('a',40); adm uuid; resultado text; revisao_inicial bigint; pendencia uuid:=gen_random_uuid();
begin
  if has_function_privilege('anon','public.observar_render_contingencia(text,text,text)','execute')
    or has_function_privilege('authenticated','public.configurar_contingencia_automatica(uuid,boolean,text)','execute') then raise exception 'RPC pública'; end if;
  select u.id into adm from public.usuarios u join public.empresa_usuarios v on v.usuario_id=u.id
    where u.ativo and u.perfil='ADMIN' and u.empresa_id='00000000-0000-4000-8000-000000000001'
      and v.empresa_id=u.empresa_id and v.ativo and v.papel in ('SUPERADMIN','ADMIN_EMPRESA') limit 1;
  if adm is null then raise exception 'ADM fixture ausente'; end if;
  perform public.configurar_contingencia_automatica(adm,true,servico);
  update public.contingencia_controle set executor='RENDER',commit_validado=versao,validado_em=now() where id=true returning revisao into revisao_inicial;
  delete from public.contingencia_requisicoes;
  delete from public.contingencia_trabalhos;
  if public.observar_render_contingencia(servico,'BILLING',versao)<>'CONFIRMANDO_BILLING' then raise exception 'Primeira observação'; end if;
  if public.observar_render_contingencia(servico,'BILLING',versao)<>'AGUARDANDO_INTERVALO' then raise exception 'Consultas rápidas'; end if;
  update public.contingencia_automacao set ultima_consulta=now()-interval '65 seconds',billing_desde=now()-interval '65 seconds' where id=true;
  if public.observar_render_contingencia(servico,'INDETERMINADO',versao)<>'OBSERVADO' then raise exception 'Falha de provedor'; end if;
  if (select observacoes_billing from public.contingencia_automacao where id=true)<>0 then raise exception 'Falha manteve evidência velha'; end if;
  update public.contingencia_automacao set ultima_consulta=now()-interval '65 seconds' where id=true;
  if public.observar_render_contingencia(servico,'BILLING',versao)<>'CONFIRMANDO_BILLING' then raise exception 'Recomeço'; end if;
  update public.contingencia_automacao set ultima_consulta=now()-interval '65 seconds',billing_desde=now()-interval '65 seconds' where id=true;
  if public.observar_render_contingencia(servico,'BILLING',repeat('b',40))<>'VERSAO_NAO_VALIDADA' then raise exception 'Versão não validada'; end if;
  update public.contingencia_automacao set ultima_consulta=now()-interval '65 seconds' where id=true;
  insert into public.contingencia_requisicoes(id,executor,namespace) values(pendencia,'RENDER','/autoteste');
  if public.observar_render_contingencia(servico,'BILLING',versao)<>'AGUARDANDO_OPERACOES' then raise exception 'Requisição em andamento'; end if;
  delete from public.contingencia_requisicoes where id=pendencia;
  update public.contingencia_automacao set ultima_consulta=now()-interval '65 seconds' where id=true;
  insert into public.contingencia_trabalhos(nome,estado,executor,dono,lease_ate,proxima_execucao)
    values('COTAS','REVISAO','RENDER',gen_random_uuid(),now(),now());
  if public.observar_render_contingencia(servico,'BILLING',versao)<>'AGUARDANDO_OPERACOES' then raise exception 'Trabalho incerto'; end if;
  delete from public.contingencia_trabalhos where nome='COTAS';
  update public.contingencia_automacao set ultima_consulta=now()-interval '65 seconds' where id=true;
  if public.observar_render_contingencia(servico,'BILLING',versao)<>'NETLIFY_ATIVADA' then raise exception 'Troca confirmada'; end if;
  if not exists(select 1 from public.contingencia_controle where id=true and executor='NETLIFY' and revisao=revisao_inicial+1) then raise exception 'Revisão inválida'; end if;
  update public.contingencia_automacao set ultima_consulta=now()-interval '65 seconds' where id=true;
  perform public.observar_render_contingencia(servico,'BILLING',versao);
  update public.contingencia_automacao set ultima_consulta=now()-interval '65 seconds' where id=true;
  perform public.observar_render_contingencia(servico,'ATIVO',versao);
  if not exists(select 1 from public.contingencia_controle where id=true and executor='NETLIFY' and revisao=revisao_inicial+1) then raise exception 'Repetição ou retorno automático indevido'; end if;
  if not exists(select 1 from public.auditoria_seguranca where acao='CONTINGENCIA_TROCA_AUTOMATICA' and detalhes->>'commit_validado'=versao) then raise exception 'Auditoria ausente'; end if;
  perform public.configurar_contingencia_automatica(adm,false,servico);
  if public.observar_render_contingencia(servico,'BILLING',versao)<>'DESATIVADA' then raise exception 'Desativação ignorada'; end if;
end $$;
select 'OK: confirmação consecutiva, falha de provedor, intervalo, versão, operações pendentes, troca única, auditoria, retorno manual e desativação' as resultado;
rollback;
