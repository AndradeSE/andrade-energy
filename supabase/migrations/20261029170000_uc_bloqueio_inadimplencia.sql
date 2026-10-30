create table if not exists public.uc_bloqueios_inadimplencia(
 empresa_id uuid not null,unidade_consumidora_id uuid not null,suspenso boolean not null default false,
 bloqueado_em timestamptz,regularizado_em timestamptz,atualizado_em timestamptz not null default now(),
 primary key(empresa_id,unidade_consumidora_id)
);
alter table public.uc_bloqueios_inadimplencia enable row level security;
revoke all on public.uc_bloqueios_inadimplencia from anon,authenticated;
grant all on public.uc_bloqueios_inadimplencia to service_role;
alter table public.unidades_consumidoras add column if not exists rateio_ativo boolean not null default true;

create or replace function public.desativar_rateio_contrato_cancelado() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.status='CANCELADO' and old.status is distinct from new.status and new.unidade_consumidora_id is not null
 and not exists(select 1 from public.contratos c where c.empresa_id=new.empresa_id and c.unidade_consumidora_id=new.unidade_consumidora_id and c.id<>new.id
 and c.status in ('ATIVO','VIGENTE') and (c.status='VIGENTE' or c.aceite_cliente_em is not null or c.contrato_assinado_url is not null)
 and coalesce(c.dados_documento->>'assinatura_externa_pendente','false')<>'true') then
  update public.unidades_consumidoras set rateio_ativo=false where empresa_id=new.empresa_id and id=new.unidade_consumidora_id;
 end if;
 return new;
end $$;
revoke all on function public.desativar_rateio_contrato_cancelado() from public,anon,authenticated;
drop trigger if exists contrato_cancelado_desativa_rateio on public.contratos;
create trigger contrato_cancelado_desativa_rateio after update of status on public.contratos
for each row execute function public.desativar_rateio_contrato_cancelado();
