insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('contingency-uploads','contingency-uploads',false,10485760,array['application/pdf'])
on conflict(id) do nothing;
create table if not exists public.uploads_contingencia (
  id uuid primary key,
  empresa_id uuid not null references public.empresas(id),
  usuario_id uuid not null references public.usuarios(id),
  caminho text not null unique,
  nome text not null,
  tamanho integer not null check(tamanho between 1 and 10485760),
  expira_em timestamptz not null default now()+interval '15 minutes',
  criado_em timestamptz not null default now(),
  consumido_em timestamptz
);
create index if not exists uploads_contingencia_criacao on public.uploads_contingencia(criado_em);
alter table public.uploads_contingencia enable row level security;
revoke all on public.uploads_contingencia from public,anon,authenticated;
grant all on public.uploads_contingencia to service_role;
