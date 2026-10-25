begin;
alter table public.cemig_simulacoes add column if not exists steel_autorizado boolean not null default false;
alter table public.cemig_simulacoes add column if not exists navegador_provedor text
 check(navegador_provedor in ('BROWSERBASE','STEEL'));

-- Consent and reservation are committed together before the worker sees the row.
create or replace function public.reservar_cemig_simulacao_render_v2(
 p_empresa uuid,p_usina uuid,p_usuario uuid,p_competencia text,p_uc text,p_arquivo text,p_csv text,p_steel boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare novo uuid;
begin
 novo:=public.reservar_cemig_simulacao_render(p_empresa,p_usina,p_usuario,p_competencia,p_uc,p_arquivo,p_csv);
 update public.cemig_simulacoes set steel_autorizado=coalesce(p_steel,false) where id=novo;
 return novo;
end $$;
revoke all on function public.reservar_cemig_simulacao_render_v2(uuid,uuid,uuid,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.reservar_cemig_simulacao_render_v2(uuid,uuid,uuid,text,text,text,text,boolean) to service_role;
commit;
