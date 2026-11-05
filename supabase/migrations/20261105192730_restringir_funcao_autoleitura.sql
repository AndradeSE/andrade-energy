-- Somente o backend usa a API de dados. Funções de trigger não são RPCs públicas.
revoke all on function public.sincronizar_autoleitura_rural() from public, anon, authenticated;
grant execute on function public.sincronizar_autoleitura_rural() to service_role;

-- Novas funções devem receber concessões explícitas, em vez de nascerem públicas.
alter default privileges for role postgres in schema public revoke execute on functions from public;
