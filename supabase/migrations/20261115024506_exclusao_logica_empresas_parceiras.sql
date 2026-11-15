-- Exclusão preserva referências e histórico; não apaga usuários nem operações.
alter table public.empresas add column if not exists excluida_em timestamptz;
alter table public.empresas add constraint empresas_excluidas_inativas
  check (excluida_em is null or ativo = false);
alter table public.empresas add constraint empresas_proprietarias_preservadas
  check (excluida_em is null or (empresa_proprietaria = false and id <> '00000000-0000-4000-8000-000000000001'::uuid));
