-- Preview only. Fixtures, ownership and notification outbox are all rolled back.
begin;
do $$
declare adm uuid; rev bigint; version text:=repeat('a',40); request_id uuid:=gen_random_uuid(); result text;
begin
 if has_function_privilege('anon','public.observar_cascata_contingencia(text,text,text,text,text)','execute') or
   has_function_privilege('authenticated','public.configurar_contingencia_cascata(uuid,boolean,bigint)','execute') then raise exception 'RPC pública';end if;
 select u.id into adm from public.usuarios u join public.empresa_usuarios v on v.usuario_id=u.id where u.ativo and u.perfil='ADMIN'
   and u.empresa_id='00000000-0000-4000-8000-000000000001' and v.empresa_id=u.empresa_id and v.ativo and v.papel in ('SUPERADMIN','ADMIN_EMPRESA') limit 1;
 if adm is null then raise exception 'ADM ausente';end if;
 perform public.configurar_contingencia_automatica(adm,true,'srv-das0mmfpn0mc73ec00hg');
 update public.contingencia_controle set executor='RENDER',reserva_preferida='RENDER_RESERVA',commit_validado=version,validado_em=now(),render_reserva_commit_validado=version,render_reserva_validado_em=now() where id=true returning revisao into rev;
 delete from public.contingencia_requisicoes;delete from public.contingencia_trabalhos;
 perform public.configurar_contingencia_cascata(adm,true,rev);
 -- Existing first stage remains unchanged.
 if public.observar_render_reserva_contingencia('srv-das0mmfpn0mc73ec00hg','BILLING',version)<>'CONFIRMANDO_BILLING' then raise exception 'Primeiro billing principal';end if;
 update public.contingencia_automacao set ultima_consulta=now()-interval '65 seconds',billing_desde=now()-interval '65 seconds' where id=true;
 if public.observar_render_reserva_contingencia('srv-das0mmfpn0mc73ec00hg','BILLING',version)<>'RENDER_RESERVA_ATIVADA' then raise exception 'Primeira etapa falhou';end if;
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','BILLING','ATIVO',version)<>'OBSERVADO' then raise exception 'Reserva saudável';end if;
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds' where id=true;
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','BILLING',version)<>'CONFIRMANDO_BILLING' then raise exception 'Confirmação reserva';end if;
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','BILLING',version)<>'AGUARDANDO_INTERVALO' then raise exception 'Intervalo ausente';end if;
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds',reserva_desde=now()-interval '65 seconds' where id=true;
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','INDETERMINADO',version)<>'OBSERVADO' then raise exception 'Timeout virou suspensão';end if;
 if (select reserva_contagem from public.contingencia_cascata where id=true)<>0 then raise exception 'Evidência antiga mantida';end if;
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds' where id=true;
 perform public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','BILLING',version);
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds',reserva_desde=now()-interval '65 seconds' where id=true;
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','BILLING',repeat('b',40))<>'VERSAO_NAO_VALIDADA' then raise exception 'Versão inválida aceita';end if;
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds' where id=true;
 insert into public.contingencia_requisicoes(id,executor,namespace)values(request_id,'RENDER_RESERVA','/autoteste');
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','BILLING',version)<>'AGUARDANDO_OPERACOES' then raise exception 'Operação ignorada';end if;
 delete from public.contingencia_requisicoes where id=request_id;
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds' where id=true;
 insert into public.contingencia_trabalhos(nome,estado,executor,dono,lease_ate,proxima_execucao)values('COTAS','REVISAO','RENDER_RESERVA',gen_random_uuid(),now(),now());
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','BILLING',version)<>'AGUARDANDO_OPERACOES' then raise exception 'Trabalho incerto ignorado';end if;
 delete from public.contingencia_trabalhos where nome='COTAS';
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds' where id=true;
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','BILLING',version)<>'NETLIFY_ATIVADA' then raise exception 'Segunda etapa falhou';end if;
 if not exists(select 1 from public.contingencia_controle where executor='NETLIFY' and revisao=rev+2)then raise exception 'Revisão duplicada';end if;
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds' where id=true;
 perform public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','ATIVO',version);
 if not exists(select 1 from public.contingencia_controle where executor='NETLIFY' and revisao=rev+2)then raise exception 'Retorno automático';end if;
 -- Both Renders suspended before first stage: never activate the unusable reserve.
 update public.contingencia_controle set executor='RENDER' where id=true;
 perform public.configurar_contingencia_cascata(adm,true,rev+2);
 perform public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','BILLING',version);
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds',reserva_desde=now()-interval '65 seconds' where id=true;
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','ATIVO','BILLING',version)='NETLIFY_ATIVADA' then raise exception 'Principal saudável ignorado';end if;
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds' where id=true;
 perform public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','BILLING','BILLING',version);
 update public.contingencia_cascata set ultima_consulta=now()-interval '65 seconds',principal_desde=now()-interval '65 seconds' where id=true;
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','BILLING','BILLING',version)<>'NETLIFY_ATIVADA' then raise exception 'Dois suspensos sem destino';end if;
 if not exists(select 1 from public.auditoria_seguranca where acao='CONTINGENCIA_TROCA_CASCATA' and detalhes->>'commit'=version)then raise exception 'Auditoria ausente';end if;
 perform public.configurar_contingencia_cascata(adm,false,rev+3);
 if public.observar_cascata_contingencia('srv-das0mmfpn0mc73ec00hg','srv-dbee79i9lscs73ase56g','BILLING','BILLING',version)<>'DESATIVADA' then raise exception 'Desativação ignorada';end if;
end $$;
rollback;
select 'OK: cascata completa, ambos suspensos, isolamento, confirmação consecutiva, timeout, versão, operações pendentes, auditoria e retorno manual' as resultado;
