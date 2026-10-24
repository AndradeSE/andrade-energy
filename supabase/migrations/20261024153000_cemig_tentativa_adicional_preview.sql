-- Preview: uma tentativa adicional em 24/10 BRT; registros e limite do provedor preservados.
create or replace function public.reservar_cemig_simulacao(p_empresa uuid,p_usina uuid,p_usuario uuid,p_competencia text,p_uc text,p_arquivo text,p_csv text)
returns uuid language plpgsql security definer set search_path=public as $$
declare novo uuid;
begin
 perform pg_advisory_xact_lock(hashtext('cemig-browserbase-free'));
 if not exists(select 1 from usinas where id=p_usina and empresa_id=p_empresa) then raise exception 'Usina não encontrada'; end if;
 update cemig_simulacoes set estado='EXPIRADO',csv_cifrado=null,live_cifrado=null
 where expira_em<now() and estado in ('FILA','INICIANDO','AGUARDANDO_LOGIN','VALIDANDO');
 if exists(select 1 from cemig_simulacoes where estado in ('FILA','INICIANDO','AGUARDANDO_LOGIN','VALIDANDO')) then raise exception 'Já existe uma simulação em andamento'; end if;
 if (select count(*) from cemig_simulacoes where criado_em>=date_trunc('month',now()))>=(case when now() >= timestamptz '2026-10-24 03:00:00+00' and now() < timestamptz '2026-10-25 03:00:00+00' then 4 else 3 end) then raise exception 'Limite gratuito de simulações atingido'; end if;
 insert into cemig_simulacoes(empresa_id,usina_id,usuario_id,competencia,uc_geradora,arquivo,csv_cifrado)
 values(p_empresa,p_usina,p_usuario,p_competencia,p_uc,p_arquivo,p_csv) returning id into novo;
 return novo;
end $$;
revoke all on function public.reservar_cemig_simulacao(uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reservar_cemig_simulacao(uuid,uuid,uuid,text,text,text,text) to service_role;

