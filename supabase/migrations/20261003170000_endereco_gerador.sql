-- Endereço civil/comercial do locador. O endereço da usina continua sendo
-- o endereço físico da instalação geradora e não identifica o locador.
alter table public.empresas
  add column if not exists endereco text;
