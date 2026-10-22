begin;
create table if not exists public.rateio_configuracoes (
  usina_id uuid primary key references public.usinas(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id),
  uc_ancora text not null default '' check (uc_ancora = '' or uc_ancora ~ '^[0-9]{6,20}$'),
  numeros_confirmados boolean not null default false,
  habilitado boolean not null default true,
  competencia_inicio date not null default date_trunc('month', now())::date,
  atualizado_em timestamptz not null default now()
);
create table if not exists public.rateios_mensais_automaticos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  usina_id uuid not null references public.usinas(id) on delete cascade,
  competencia date not null,
  status text not null default 'AGUARDANDO' check (status in ('AGUARDANDO','GERANDO','GERADO','ERRO')),
  ucs_esperadas jsonb not null default '[]',
  resultado jsonb,
  tentativas integer not null default 0,
  lease_id uuid,
  lease_ate timestamptz,
  erro text,
  email_status text not null default 'PENDENTE' check (email_status in ('PENDENTE','ENVIANDO','ENVIADO','NAO_ENVIADO')),
  gerado_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, usina_id, competencia)
);
alter table public.rateio_configuracoes enable row level security;
alter table public.rateios_mensais_automaticos enable row level security;
revoke all on public.rateio_configuracoes,public.rateios_mensais_automaticos from anon,authenticated;
grant all on public.rateio_configuracoes,public.rateios_mensais_automaticos to service_role;

insert into public.rateio_configuracoes(usina_id,empresa_id)
select id,empresa_id from public.usinas where empresa_id is not null on conflict(usina_id) do nothing;

create or replace function public.reivindicar_rateio_mensal(p_empresa uuid,p_usina uuid,p_competencia date,p_ucs jsonb)
returns setof public.rateios_mensais_automaticos
language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.usinas where id=p_usina and empresa_id=p_empresa) then raise exception 'Usina inválida'; end if;
  insert into public.rateios_mensais_automaticos(empresa_id,usina_id,competencia)
    values(p_empresa,p_usina,p_competencia) on conflict(empresa_id,usina_id,competencia) do nothing;
  return query update public.rateios_mensais_automaticos
    set status='GERANDO',ucs_esperadas=p_ucs,tentativas=tentativas+1,lease_id=gen_random_uuid(),lease_ate=now()+interval '10 minutes',atualizado_em=now()
    where empresa_id=p_empresa and usina_id=p_usina and competencia=p_competencia
      and status<>'GERADO' and tentativas<5
      and (lease_ate is null or lease_ate<now())
    returning *;
end $$;
revoke all on function public.reivindicar_rateio_mensal(uuid,uuid,date,jsonb) from public,anon,authenticated;
grant execute on function public.reivindicar_rateio_mensal(uuid,uuid,date,jsonb) to service_role;
commit;
