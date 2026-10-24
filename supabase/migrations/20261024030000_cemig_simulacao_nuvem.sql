-- Simulação de anexo: nunca autoriza protocolo na distribuidora.
create table if not exists public.cemig_simulacoes (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.empresas(id),
 usina_id uuid not null references public.usinas(id),
 usuario_id uuid not null references public.usuarios(id),
 competencia text not null check (competencia ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
 uc_geradora text not null, arquivo text not null,
 csv_cifrado text, live_cifrado text,
 estado text not null default 'FILA' check (estado in ('FILA','INICIANDO','AGUARDANDO_LOGIN','VALIDANDO','REVISAO_SEM_PROTOCOLO','ERRO','CANCELADO','EXPIRADO')),
 continuar boolean not null default false,
 sessao_id text, erro text,
 criado_em timestamptz not null default now(),
 expira_em timestamptz not null default now()+interval '11 minutes'
);
alter table public.cemig_simulacoes enable row level security;
revoke all on public.cemig_simulacoes from anon, authenticated;
grant all on public.cemig_simulacoes to service_role;
create index if not exists cemig_simulacoes_criado_idx on public.cemig_simulacoes(criado_em);

create or replace function public.reservar_cemig_simulacao(p_empresa uuid,p_usina uuid,p_usuario uuid,p_competencia text,p_uc text,p_arquivo text,p_csv text)
returns uuid language plpgsql security definer set search_path=public as $$
declare novo uuid;
begin
 perform pg_advisory_xact_lock(hashtext('cemig-browserbase-free'));
 if not exists(select 1 from usinas where id=p_usina and empresa_id=p_empresa) then raise exception 'Usina não encontrada'; end if;
 update cemig_simulacoes set estado='EXPIRADO',csv_cifrado=null,live_cifrado=null
 where expira_em<now() and estado in ('FILA','INICIANDO','AGUARDANDO_LOGIN','VALIDANDO');
 if exists(select 1 from cemig_simulacoes where estado in ('FILA','INICIANDO','AGUARDANDO_LOGIN','VALIDANDO')) then raise exception 'Já existe uma simulação em andamento'; end if;
 if (select count(*) from cemig_simulacoes where criado_em>=date_trunc('month',now()))>=3 then raise exception 'Limite gratuito de simulações atingido'; end if;
 insert into cemig_simulacoes(empresa_id,usina_id,usuario_id,competencia,uc_geradora,arquivo,csv_cifrado)
 values(p_empresa,p_usina,p_usuario,p_competencia,p_uc,p_arquivo,p_csv) returning id into novo;
 return novo;
end $$;
revoke all on function public.reservar_cemig_simulacao(uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reservar_cemig_simulacao(uuid,uuid,uuid,text,text,text,text) to service_role;
