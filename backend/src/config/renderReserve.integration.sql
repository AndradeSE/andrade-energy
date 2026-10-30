-- Run with the migration in a transaction and ROLLBACK. No financial effects.
do $$
declare adm uuid; rev bigint; request_id uuid:=gen_random_uuid(); version text:=repeat('c',40); blocked boolean;
begin
  if has_function_privilege('anon','public.iniciar_requisicao_contingencia(uuid,text,text,text)','execute')
    or has_function_privilege('authenticated','public.trocar_executor_contingencia(uuid,text,bigint,text)','execute') then
    raise exception 'Public ownership RPC';
  end if;
  select u.id into adm from public.usuarios u join public.empresa_usuarios v on v.usuario_id=u.id
    where u.ativo and u.perfil='ADMIN' and u.empresa_id='00000000-0000-4000-8000-000000000001'
      and v.empresa_id=u.empresa_id and v.ativo and v.papel in ('SUPERADMIN','ADMIN_EMPRESA') limit 1;
  if adm is null then raise exception 'No ADM fixture'; end if;
  delete from public.contingencia_requisicoes;
  delete from public.contingencia_trabalhos;
  update public.contingencia_controle set executor='RENDER',commit_validado=version,validado_em=now(),
    render_reserva_commit_validado=null,render_reserva_validado_em=null where id=true returning revisao into rev;
  if public.iniciar_requisicao_contingencia(request_id,'RENDER_RESERVA','/autoteste',version) then raise exception 'Inactive reserve ran'; end if;
  blocked:=false;
  begin perform public.trocar_executor_contingencia(adm,'RENDER_RESERVA',rev,'COTA_RENDER_ESGOTADA');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Unvalidated reserve accepted'; end if;
  update public.contingencia_controle set render_reserva_commit_validado=version,render_reserva_validado_em=now() where id=true;
  if not public.iniciar_requisicao_contingencia(request_id,'RENDER','/autoteste',null) then raise exception 'Primary not available'; end if;
  blocked:=false;
  begin perform public.trocar_executor_contingencia(adm,'RENDER_RESERVA',rev,'COTA_RENDER_ESGOTADA');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'In-flight request ignored'; end if;
  perform public.finalizar_requisicao_contingencia(request_id,'RENDER');
  rev:=public.trocar_executor_contingencia(adm,'RENDER_RESERVA',rev,'COTA_RENDER_ESGOTADA');
  if public.iniciar_requisicao_contingencia(request_id,'RENDER','/autoteste',null)
    or public.iniciar_requisicao_contingencia(request_id,'NETLIFY','/autoteste',version)
    or public.iniciar_requisicao_contingencia(request_id,'RENDER_RESERVA','/autoteste',repeat('d',40)) then
    raise exception 'Wrong owner or deployment accepted';
  end if;
  if not public.iniciar_requisicao_contingencia(request_id,'RENDER_RESERVA','/autoteste',version) then raise exception 'Validated owner rejected'; end if;
  perform public.finalizar_requisicao_contingencia(request_id,'RENDER_RESERVA');
  if not public.reservar_trabalho_contingencia('FATURAS_EMAIL','RENDER_RESERVA',request_id,60,version) then raise exception 'Reserve lease rejected'; end if;
  if public.reservar_trabalho_contingencia('FATURAS_EMAIL','RENDER',gen_random_uuid(),60,null) then raise exception 'Primary duplicated job'; end if;
  perform public.finalizar_trabalho_contingencia('FATURAS_EMAIL',request_id,false);
  blocked:=false;
  begin perform public.trocar_executor_contingencia(adm,'RENDER',rev,'RENDER_RECUPERADO');
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Uncertain business work ignored'; end if;
end $$;
select 'OK: inactive reserve, release isolation, in-flight fencing, exclusive ownership, uncertain work and private RPCs' as resultado;
