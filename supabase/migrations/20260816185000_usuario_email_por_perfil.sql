alter table public.usuarios
  drop constraint if exists usuarios_email_key;

create unique index if not exists usuarios_email_perfil_key
  on public.usuarios (lower(email), perfil);
