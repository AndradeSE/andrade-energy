-- Preview only. This test always rolls back.
begin;

do $$ declare svc text; sha text:=repeat('a',40); begin
update public.contingencia_controle set executor='RENDER',reserva_preferida='NETLIFY',commit_validado=sha,validado_em=now() where id;
update public.contingencia_automacao set ativa=true,ultimo_estado='BILLING',ultima_consulta=now()-interval '70 seconds',billing_desde=now()-interval '70 seconds',observacoes_billing=1 where id returning render_service_id into svc;
delete from public.contingencia_requisicoes;
delete from public.contingencia_trabalhos;
insert into public.contingencia_trabalhos values('RATEIOS','EXECUTANDO','RENDER',gen_random_uuid(),now()+interval '1 minute',now(),now());
if public.observar_render_contingencia(svc,'BILLING',sha) is distinct from 'AGUARDANDO_OPERACOES' then raise exception 'Prazo vigente desconsiderado'; end if;
update public.contingencia_automacao set ultima_consulta=now()-interval '70 seconds' where id;
update public.contingencia_trabalhos set lease_ate=now()-interval '1 second' where nome='RATEIOS';
if public.observar_render_contingencia(svc,'BILLING',sha) is distinct from 'NETLIFY_ATIVADA' then raise exception 'Netlify não assumiu'; end if;
if (select estado from public.contingencia_trabalhos where nome='RATEIOS') is distinct from 'REVISAO' then raise exception 'Rateio não foi isolado'; end if;
if public.reservar_trabalho_contingencia('RATEIOS','NETLIFY',gen_random_uuid(),60,sha) then raise exception 'Rateio incerto reexecutado'; end if;
if not public.reservar_trabalho_contingencia('CONVITES','NETLIFY',gen_random_uuid(),60,sha) then raise exception 'Tarefa independente bloqueada'; end if;
end $$;
select 'OK' as teste;
rollback;
