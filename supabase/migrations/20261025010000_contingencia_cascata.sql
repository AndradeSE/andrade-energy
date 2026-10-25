alter table public.contingencia_automacao add column if not exists cascata_ativa boolean not null default false;
create table if not exists public.contingencia_cascata (
 id boolean primary key default true check(id), ultima_consulta timestamptz,
 estado_principal text, estado_reserva text, principal_desde timestamptz, reserva_desde timestamptz,
 principal_contagem integer not null default 0, reserva_contagem integer not null default 0,
 ultimo_resultado text
);
insert into public.contingencia_cascata(id) values(true) on conflict do nothing;
alter table public.contingencia_cascata enable row level security;
revoke all on public.contingencia_cascata from public,anon,authenticated;
grant select on public.contingencia_cascata to service_role;

create or replace function public.configurar_contingencia_cascata(p_usuario uuid,p_ativa boolean,p_revisao bigint)
returns void language plpgsql security definer set search_path='' as $$
declare c public.contingencia_controle;
begin
 if p_ativa is null or not exists(select 1 from public.usuarios u join public.empresa_usuarios v on v.usuario_id=u.id
   where u.id=p_usuario and u.ativo and u.perfil='ADMIN' and u.empresa_id='00000000-0000-4000-8000-000000000001'
   and v.empresa_id=u.empresa_id and v.ativo and v.papel in ('SUPERADMIN','ADMIN_EMPRESA')) then raise exception 'Acesso exclusivo de ADM'; end if;
 select * into c from public.contingencia_controle where id=true for update;
 if p_revisao is distinct from c.revisao or (p_ativa and (c.reserva_preferida<>'RENDER_RESERVA' or c.commit_validado is null or c.validado_em is null
   or c.render_reserva_commit_validado is null or c.render_reserva_validado_em is null)) then raise exception 'Conferência da cascata pendente'; end if;
 update public.contingencia_automacao set cascata_ativa=p_ativa where id=true;
 update public.contingencia_cascata set ultima_consulta=null,principal_desde=null,reserva_desde=null,principal_contagem=0,reserva_contagem=0,estado_principal=null,estado_reserva=null where id=true;
 insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
 values('00000000-0000-4000-8000-000000000001',p_usuario,'CONTINGENCIA_CASCATA_CONFIGURADA','contingencia_controle',jsonb_build_object('ativa',p_ativa,'revisao',c.revisao));
end $$;

create or replace function public.observar_cascata_contingencia(p_principal text,p_reserva text,p_estado_principal text,p_estado_reserva text,p_commit text)
returns text language plpgsql security definer set search_path='' as $$
declare c public.contingencia_controle; a public.contingencia_automacao; m public.contingencia_cascata;
 agora timestamptz:=clock_timestamp(); resultado text:='OBSERVADO'; confirmado boolean;
begin
 if p_estado_principal is null or p_estado_reserva is null or p_estado_principal not in ('ATIVO','BILLING','OUTRA_SUSPENSAO','INDETERMINADO')
   or p_estado_reserva not in ('ATIVO','BILLING','OUTRA_SUSPENSAO','INDETERMINADO') then raise exception 'Observação inválida'; end if;
 select * into c from public.contingencia_controle where id=true for update;
 select * into a from public.contingencia_automacao where id=true for update;
 select * into m from public.contingencia_cascata where id=true for update;
 if not a.ativa or not a.cascata_ativa then return 'DESATIVADA'; end if;
 if c.reserva_preferida<>'RENDER_RESERVA' then return 'DESTINO_DIVERGENTE'; end if;
 if p_principal is distinct from a.render_service_id or p_reserva is distinct from
   (case a.render_service_id when 'srv-das0mmfpn0mc73ec00hg' then 'srv-dbee79i9lscs73ase56g'
     when 'srv-da0iso5bedkc73asecig' then 'srv-dbejmn5g1s2s73fqn6m0' else null end) or p_reserva is null then raise exception 'Serviço divergente'; end if;
 if m.ultima_consulta>agora-interval '45 seconds' then return 'AGUARDANDO_INTERVALO'; end if;
 if p_estado_principal='BILLING' then
   if m.estado_principal='BILLING' and m.ultima_consulta>=agora-interval '5 minutes' then m.principal_contagem:=m.principal_contagem+1;
   else m.principal_contagem:=1;m.principal_desde:=agora;end if;
 else m.principal_contagem:=0;m.principal_desde:=null;end if;
 if p_estado_reserva='BILLING' then
   if m.estado_reserva='BILLING' and m.ultima_consulta>=agora-interval '5 minutes' then m.reserva_contagem:=m.reserva_contagem+1;
   else m.reserva_contagem:=1;m.reserva_desde:=agora;end if;
 else m.reserva_contagem:=0;m.reserva_desde:=null;end if;
 confirmado:=p_estado_reserva='BILLING' and m.reserva_contagem>=2 and m.reserva_desde<=agora-interval '60 seconds';
 if c.executor='RENDER' then confirmado:=confirmado and p_estado_principal='BILLING' and m.principal_contagem>=2 and m.principal_desde<=agora-interval '60 seconds';end if;
 if c.executor in ('RENDER','RENDER_RESERVA') and p_estado_reserva='BILLING' then
   if not coalesce(confirmado,false) then resultado:='CONFIRMANDO_BILLING';
   elsif p_commit is null or c.commit_validado is distinct from p_commit or c.validado_em is null then resultado:='VERSAO_NAO_VALIDADA';
   elsif exists(select 1 from public.contingencia_requisicoes) or exists(select 1 from public.contingencia_trabalhos where estado in ('EXECUTANDO','REVISAO')) then
     resultado:='AGUARDANDO_OPERACOES';
     perform public.avisar_contingencia_automatica('Cascata: conferência necessária','Há operações em execução ou pendentes de revisão. A troca para a Netlify foi bloqueada para evitar duplicações.','cascata-bloqueada:'||c.revisao);
   else
     update public.contingencia_controle set executor='NETLIFY',revisao=revisao+1,atualizado_em=agora where id=true returning * into c;
     resultado:='NETLIFY_ATIVADA';
     insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
     values('00000000-0000-4000-8000-000000000001',a.ativado_por,'CONTINGENCIA_TROCA_CASCATA','contingencia_controle',jsonb_build_object('executor','NETLIFY','revisao',c.revisao,'principal',p_principal,'reserva',p_reserva,'motivo','billing','commit',p_commit));
     perform public.avisar_contingencia_automatica('Segundo servidor reserva ativado','A Netlify assumiu após suspensão por cobrança confirmada do Render reserva. O retorno ao principal depende de confirmação do ADM.','cascata-ativada:'||c.revisao);
   end if;
 end if;
 update public.contingencia_cascata set ultima_consulta=agora,estado_principal=p_estado_principal,estado_reserva=p_estado_reserva,
   principal_contagem=m.principal_contagem,reserva_contagem=m.reserva_contagem,principal_desde=m.principal_desde,reserva_desde=m.reserva_desde,ultimo_resultado=resultado where id=true;
 return resultado;
end $$;
revoke all on function public.configurar_contingencia_cascata(uuid,boolean,bigint) from public,anon,authenticated;
revoke all on function public.observar_cascata_contingencia(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.configurar_contingencia_cascata(uuid,boolean,bigint) to service_role;
grant execute on function public.observar_cascata_contingencia(text,text,text,text,text) to service_role;
