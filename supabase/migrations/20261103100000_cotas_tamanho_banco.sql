-- Aggregate only: no table contents or credentials returned. Backend service role only.
create or replace function public.consultar_tamanho_banco_cotas()
returns bigint language sql security definer set search_path = ''
as $$ select pg_catalog.pg_database_size(pg_catalog.current_database()); $$;
revoke all on function public.consultar_tamanho_banco_cotas() from public, anon, authenticated;
grant execute on function public.consultar_tamanho_banco_cotas() to service_role;
