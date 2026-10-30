-- Mantém a minuta gerada separada do contrato efetivamente assinado.
alter table public.contratos
  add column if not exists dados_documento jsonb not null default '{}'::jsonb,
  add column if not exists contrato_gerado_url text,
  add column if not exists contrato_assinado_url text,
  add column if not exists gerado_em timestamptz,
  add column if not exists assinado_em timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contratos', 'contratos', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
