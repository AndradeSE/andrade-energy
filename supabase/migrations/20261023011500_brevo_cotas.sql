create or replace function public.registrar_cota_servico(
  p_ambiente text,p_servico text,p_metrica text,p_renova_em timestamptz,p_rotulo text,
  p_usado numeric,p_limite numeric,p_origem text)
returns integer language plpgsql security definer set search_path='' as $$
declare faixa smallint:=0; anterior smallint; membro record; titulo text; detalhe text; total integer:=0;
begin
  if p_ambiente not in ('preview','production') or p_servico not in ('RESEND','BREVO','RENDER','NETLIFY','SUPABASE')
    or p_renova_em<=clock_timestamp() then raise exception 'Leitura de cota inválida'; end if;
  insert into public.cotas_servicos as c(ambiente,servico,metrica,renova_em,rotulo,usado,limite,origem)
  values(p_ambiente,p_servico,p_metrica,p_renova_em,p_rotulo,p_usado,p_limite,p_origem)
  on conflict(ambiente,servico,metrica,renova_em) do update set
    usado=excluded.usado,limite=excluded.limite,origem=excluded.origem,verificado_em=clock_timestamp(),rotulo=excluded.rotulo;
  select ultima_faixa into anterior from public.cotas_servicos
    where ambiente=p_ambiente and servico=p_servico and metrica=p_metrica and renova_em=p_renova_em for update;
  if p_limite is not null then
    faixa:=case when p_usado>=p_limite then 100 when p_usado>=p_limite*0.9 then 90 when p_usado>=p_limite*0.8 then 80 else 0 end;
  end if;
  if faixa<=anterior then return 0; end if;
  titulo:=case when p_ambiente='preview' then '[Preview] ' else '' end || p_servico || ': cota ' || faixa || '% utilizada';
  detalhe:=p_rotulo || ': ' || p_usado::text || ' de ' || p_limite::text || '. Restante: ' || greatest(p_limite-p_usado,0)::text ||
    '. Confira a renovação e as informações em Cotas de serviços. Nenhum plano ou pagamento foi alterado.';
  for membro in select distinct v.usuario_id from public.empresa_usuarios v
    join public.usuarios u on u.id=v.usuario_id
    where v.empresa_id='00000000-0000-4000-8000-000000000001' and v.ativo and u.ativo and u.perfil='ADMIN'
      and u.empresa_id='00000000-0000-4000-8000-000000000001' and v.papel in ('SUPERADMIN','ADMIN_EMPRESA')
  loop
    perform public.criar_notificacao_com_push(jsonb_build_object('usuario_id',membro.usuario_id,
      'empresa_id','00000000-0000-4000-8000-000000000001','tipo','COTA_SERVICO','titulo',titulo,'detalhe',detalhe,
      'rota','/cotas-servicos','chave_dedupe','cota:'||p_ambiente||':'||p_servico||':'||p_metrica||':'||p_renova_em::text||':'||faixa||':'||membro.usuario_id));
    total:=total+1;
  end loop;
  -- Marker and outbox commit together. No duplicate/regressive alert on polling.
  if total>0 then update public.cotas_servicos set ultima_faixa=faixa
    where ambiente=p_ambiente and servico=p_servico and metrica=p_metrica and renova_em=p_renova_em; end if;
  return total;
end;
$$;
revoke all on function public.registrar_cota_servico(text,text,text,timestamptz,text,numeric,numeric,text) from public,anon,authenticated;
grant execute on function public.registrar_cota_servico(text,text,text,timestamptz,text,numeric,numeric,text) to service_role;

