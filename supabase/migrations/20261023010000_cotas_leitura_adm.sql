-- A manual provider reading, its audit and threshold notifications are atomic.
create or replace function public.registrar_cota_manual_adm(
  p_usuario_id uuid,p_ambiente text,p_servico text,p_metrica text,p_valida_ate timestamptz,
  p_rotulo text,p_usado numeric,p_limite numeric)
returns integer language plpgsql security definer set search_path='' as $$
declare total integer;
begin
  if not exists (select 1 from public.usuarios u join public.empresa_usuarios v on v.usuario_id=u.id
    where u.id=p_usuario_id and u.ativo and u.perfil='ADMIN'
      and u.empresa_id='00000000-0000-4000-8000-000000000001'
      and v.empresa_id=u.empresa_id and v.ativo and v.papel in ('SUPERADMIN','ADMIN_EMPRESA')) then
    raise exception 'Acesso exclusivo de ADM';
  end if;
  if p_ambiente not in ('preview','production') or p_valida_ate<=clock_timestamp()
    or p_valida_ate>clock_timestamp()+interval '370 days'
    or p_usado is null or p_usado<0 or p_usado>=1000000000000
    or p_limite is null or p_limite<=0 or p_limite>=1000000000000
    or not ((p_servico='RENDER' and p_metrica='horas_gratuitas')
      or (p_servico='NETLIFY' and p_metrica in ('creditos','creditos_bonus'))
      or (p_servico='SUPABASE' and p_metrica='armazenamento')) then
    raise exception 'Leitura inválida';
  end if;
  total:=public.registrar_cota_servico(p_ambiente,p_servico,p_metrica,p_valida_ate,p_rotulo,p_usado,p_limite,'PAINEL_CONFIRMADO');
  insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
    values('00000000-0000-4000-8000-000000000001',p_usuario_id,'COTA_LEITURA_CONFIRMADA','cotas_servicos',
      jsonb_build_object('ambiente',p_ambiente,'servico',p_servico,'metrica',p_metrica,'usado',p_usado,'limite',p_limite,'valida_ate',p_valida_ate));
  return total;
end;
$$;
revoke all on function public.registrar_cota_manual_adm(uuid,text,text,text,timestamptz,text,numeric,numeric) from public,anon,authenticated;
grant execute on function public.registrar_cota_manual_adm(uuid,text,text,text,timestamptz,text,numeric,numeric) to service_role;
