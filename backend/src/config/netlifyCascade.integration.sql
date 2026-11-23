-- Run in homologation after creating the private monitor functions. Always rolls back.
begin;

do $$
declare commit_sha text := repeat('a',40);
  falha jsonb := '{"environment":"production","netlify":{"status":503},"render":{"status":200,"commit":"aaaaaaa","ready":true,"executor":"RENDER_RESERVA"}}';
begin
  update public.contingencia_controle set executor='NETLIFY',render_reserva_commit_validado=commit_sha,render_reserva_validado_em=now() where id;
  update public.contingencia_automacao set ativa=true where id;
  delete from public.contingencia_requisicoes;
  delete from public.contingencia_trabalhos;
  insert into public.contingencia_trabalhos(nome,estado,executor,dono,lease_ate,proxima_execucao)
    values('RATEIOS','EXECUTANDO','NETLIFY',gen_random_uuid(),now()-interval '1 minute',now());
  if contingencia_privada.registrar_sonda_netlify(falha) <> 'CONFIRMANDO_FALHA' then raise exception 'Primeira falha'; end if;
  if contingencia_privada.registrar_sonda_netlify(falha) <> 'AGUARDANDO_INTERVALO' then raise exception 'Repetição imediata'; end if;
  update contingencia_privada.sonda_netlify set observado_em=now()-interval '1 minute';
  if contingencia_privada.registrar_sonda_netlify(jsonb_set(falha,'{render,status}','429')) <> 'SEM_EVIDENCIA' then raise exception 'Render bloqueado'; end if;
  update contingencia_privada.sonda_netlify set observado_em=now()-interval '1 minute';
  if contingencia_privada.registrar_sonda_netlify(falha) <> 'CONFIRMANDO_FALHA' then raise exception 'Contagem não reiniciada'; end if;
  update contingencia_privada.sonda_netlify set observado_em=now()-interval '1 minute';
  if contingencia_privada.registrar_sonda_netlify(falha) <> 'RENDER_RESERVA_ATIVADA' then raise exception 'Troca não executada'; end if;
  if (select estado from public.contingencia_trabalhos where nome='RATEIOS') <> 'REVISAO' then raise exception 'Rateio não isolado'; end if;
  if public.reservar_trabalho_contingencia('RATEIOS','RENDER_RESERVA',gen_random_uuid(),60,commit_sha) then raise exception 'Rateio repetido'; end if;
  if (select executor from public.contingencia_controle where id) <> 'RENDER_RESERVA' then raise exception 'Executor incorreto'; end if;
end $$;
select 'OK' as teste;
rollback;
