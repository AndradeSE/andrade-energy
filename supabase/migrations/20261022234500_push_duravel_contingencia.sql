create table if not exists public.fila_push_contingencia (
  notificacao_id uuid primary key references public.notificacoes_app(id) on delete cascade,
  contexto jsonb not null default '{}'::jsonb,
  status text not null default 'PENDENTE' check(status in ('PENDENTE','PROCESSANDO','ENVIADO','FALHA')),
  tentativas integer not null default 0,
  dono uuid,
  lease_ate timestamptz,
  proxima_tentativa timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists fila_push_contingencia_pendente on public.fila_push_contingencia(proxima_tentativa) where status in ('PENDENTE','PROCESSANDO');
alter table public.fila_push_contingencia enable row level security;
revoke all on public.fila_push_contingencia from public, anon, authenticated;
grant all on public.fila_push_contingencia to service_role;

create or replace function public.criar_notificacao_com_push(p_notificacao jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare novo uuid;
begin
  insert into public.notificacoes_app(usuario_id,empresa_id,tipo,titulo,detalhe,rota,chave_dedupe)
    values((p_notificacao->>'usuario_id')::uuid,(p_notificacao->>'empresa_id')::uuid,
      p_notificacao->>'tipo',p_notificacao->>'titulo',p_notificacao->>'detalhe',
      p_notificacao->>'rota',p_notificacao->>'chave_dedupe')
    on conflict do nothing returning id into novo;
  if novo is null then return null; end if;
  insert into public.fila_push_contingencia(notificacao_id,contexto)
    values(novo,jsonb_strip_nulls(jsonb_build_object('usina_id',p_notificacao->>'usina_id','cliente_id',p_notificacao->>'cliente_id')));
  return novo;
end;
$$;
create or replace function public.reservar_push_contingencia(p_dono uuid, p_notificacao uuid default null)
returns table(notificacao_id uuid, contexto jsonb, notificacao jsonb)
language plpgsql security definer set search_path='' as $$
begin
  return query with candidato as (
    select f.notificacao_id from public.fila_push_contingencia f
    where (p_notificacao is null or f.notificacao_id=p_notificacao)
      and f.tentativas < 5 and (
        (f.status='PENDENTE' and f.proxima_tentativa<=clock_timestamp()) or
        (f.status='PROCESSANDO' and f.lease_ate<clock_timestamp()))
    order by f.proxima_tentativa for update skip locked limit 1
  ), reservado as (
    update public.fila_push_contingencia f set status='PROCESSANDO',dono=p_dono,
      lease_ate=clock_timestamp()+interval '2 minutes',tentativas=f.tentativas+1,atualizado_em=clock_timestamp()
    from candidato c where f.notificacao_id=c.notificacao_id returning f.*
  ) select r.notificacao_id,r.contexto,to_jsonb(n) from reservado r
    join public.notificacoes_app n on n.id=r.notificacao_id;
end;
$$;
create or replace function public.finalizar_push_contingencia(p_notificacao uuid,p_dono uuid,p_sucesso boolean)
returns void language sql security definer set search_path='' as $$
  update public.fila_push_contingencia set
    status=case when p_sucesso then 'ENVIADO' when tentativas>=5 then 'FALHA' else 'PENDENTE' end,
    proxima_tentativa=clock_timestamp()+(30*power(2,tentativas))*interval '1 second',
    lease_ate=null,dono=null,atualizado_em=clock_timestamp()
  where notificacao_id=p_notificacao and dono=p_dono and status='PROCESSANDO';
$$;
revoke all on function public.criar_notificacao_com_push(jsonb) from public,anon,authenticated;
revoke all on function public.reservar_push_contingencia(uuid,uuid) from public,anon,authenticated;
revoke all on function public.finalizar_push_contingencia(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.criar_notificacao_com_push(jsonb) to service_role;
grant execute on function public.reservar_push_contingencia(uuid,uuid) to service_role;
grant execute on function public.finalizar_push_contingencia(uuid,uuid,boolean) to service_role;
