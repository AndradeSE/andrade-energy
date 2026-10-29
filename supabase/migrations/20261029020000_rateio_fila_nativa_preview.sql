-- Persistent queue, disabled until a named account explicitly enables a device.
create table if not exists public.rateio_envio_nativo_config (
 empresa_id uuid not null, usina_id uuid not null, usuario_id uuid not null,
 habilitado boolean not null default false, competencia_inicio date not null,
 atualizado_em timestamptz not null default now(),
 primary key (empresa_id,usina_id,usuario_id)
);
create table if not exists public.rateio_envios_nativos (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null, usina_id uuid not null, usuario_id uuid not null,
 competencia date not null, registro_rateio_id uuid not null,
 csv_hash text not null check (csv_hash ~ '^[a-f0-9]{64}$'),
 estado text not null default 'PENDENTE' check (estado in ('PENDENTE','EXECUTANDO','AGUARDANDO_USUARIO','REVISAO','ENVIANDO','PROTOCOLADO','INCERTO','FALHA','CANCELADO')),
 lease_id uuid, lease_ate timestamptz, protocolo text,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
 unique (empresa_id,usina_id,competencia)
);
alter table public.rateio_envio_nativo_config enable row level security;
alter table public.rateio_envios_nativos enable row level security;
revoke all on public.rateio_envio_nativo_config,public.rateio_envios_nativos from anon,authenticated;
grant all on public.rateio_envio_nativo_config,public.rateio_envios_nativos to service_role;
create or replace function public.reivindicar_envio_nativo(p_empresa uuid,p_usuario uuid,p_id uuid)
returns setof public.rateio_envios_nativos language plpgsql security invoker set search_path=public as $$
begin
 -- A process that might already have submitted is never blindly retried.
 update public.rateio_envios_nativos set estado='INCERTO',atualizado_em=now()
 where id=p_id and empresa_id=p_empresa and usuario_id=p_usuario and estado='ENVIANDO' and lease_ate<now();
 update public.rateio_envios_nativos set estado='PENDENTE',lease_id=null,lease_ate=null,atualizado_em=now()
 where id=p_id and empresa_id=p_empresa and usuario_id=p_usuario and estado='EXECUTANDO' and lease_ate<now();
 return query update public.rateio_envios_nativos set estado='EXECUTANDO',lease_id=gen_random_uuid(),lease_ate=now()+interval '10 minutes',atualizado_em=now()
 where id=p_id and empresa_id=p_empresa and usuario_id=p_usuario and estado='PENDENTE'
 and exists (select 1 from public.rateio_envio_nativo_config c where c.empresa_id=p_empresa and c.usuario_id=p_usuario and c.usina_id=rateio_envios_nativos.usina_id and c.habilitado)
 returning *;
end $$;
revoke all on function public.reivindicar_envio_nativo(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.reivindicar_envio_nativo(uuid,uuid,uuid) to service_role;
