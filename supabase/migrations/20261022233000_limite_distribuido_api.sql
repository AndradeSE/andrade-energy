-- Shared, atomic counters. Never expose counters or maintenance RPCs to clients.
create table if not exists public.limites_api (
  chave text primary key check (chave ~ '^[0-9a-f]{64}$'),
  total integer not null check (total > 0),
  reinicia_em timestamptz not null
);
create index if not exists limites_api_expiracao on public.limites_api(reinicia_em);
alter table public.limites_api enable row level security;
revoke all on public.limites_api from public, anon, authenticated;
grant select, insert, update, delete on public.limites_api to service_role;

create or replace function public.consumir_limite_api(p_chave text, p_janela_ms integer)
returns table(total integer, reinicia_em timestamptz)
language plpgsql security definer set search_path = '' as $$
declare agora timestamptz := clock_timestamp();
begin
  if p_chave is null or p_chave !~ '^[0-9a-f]{64}$' or p_janela_ms is null or p_janela_ms < 1000 or p_janela_ms > 86400000 then
    raise exception 'Parâmetros de limite inválidos';
  end if;
  -- Bounded cleanup: no scheduler and no unbounded deletion in a request.
  delete from public.limites_api where chave in
    (select l.chave from public.limites_api l where l.reinicia_em < agora - interval '1 day' limit 100);
  return query insert into public.limites_api as l(chave, total, reinicia_em)
    values(p_chave, 1, agora + p_janela_ms * interval '1 millisecond')
    on conflict(chave) do update set
      total = case when l.reinicia_em <= agora then 1 else least(l.total + 1, 2147483646) end,
      reinicia_em = case when l.reinicia_em <= agora then agora + p_janela_ms * interval '1 millisecond' else l.reinicia_em end
    returning l.total, l.reinicia_em;
end;
$$;
create or replace function public.reiniciar_limite_api(p_chave text)
returns void language sql security definer set search_path = '' as $$
  delete from public.limites_api where chave = p_chave;
$$;
revoke all on function public.consumir_limite_api(text, integer) from public, anon, authenticated;
revoke all on function public.reiniciar_limite_api(text) from public, anon, authenticated;
grant execute on function public.consumir_limite_api(text, integer) to service_role;
grant execute on function public.reiniciar_limite_api(text) to service_role;
