-- A autenticação do produto pertence à API, não ao Supabase Auth.
-- Somente o backend com service_role pode acessar o esquema de negócio.
begin;
set local lock_timeout = '5s';

do $$
declare item record;
begin
  for item in select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    if not has_table_privilege('service_role', item.oid, 'SELECT')
      or not has_table_privilege('service_role', item.oid, 'INSERT')
      or not has_table_privilege('service_role', item.oid, 'UPDATE')
      or not has_table_privilege('service_role', item.oid, 'DELETE') then
      raise exception 'Backend sem privilégios existentes na tabela %', item.relname;
    end if;
    execute format('alter table public.%I enable row level security', item.relname);
  end loop;
end $$;

revoke all privileges on all tables in schema public from public, anon, authenticated;
revoke all privileges on all sequences in schema public from public, anon, authenticated;

-- Preservar funções de extensões; bloquear RPCs próprias que contornariam a API.
do $$
declare item record;
begin
  for item in select p.oid::regprocedure as assinatura from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass
        and d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('grant execute on function %s to service_role', item.assinatura);
    execute format('revoke all privileges on function %s from public, anon, authenticated', item.assinatura);
  end loop;
end $$;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public grant execute on functions to service_role;
do $$
declare item record;
begin
  for item in select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    if not has_table_privilege('service_role', item.oid, 'SELECT')
      or not has_table_privilege('service_role', item.oid, 'INSERT')
      or not has_table_privilege('service_role', item.oid, 'UPDATE')
      or not has_table_privilege('service_role', item.oid, 'DELETE') then
      raise exception 'Correção retiraria acesso do backend à tabela %', item.relname;
    end if;
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;
