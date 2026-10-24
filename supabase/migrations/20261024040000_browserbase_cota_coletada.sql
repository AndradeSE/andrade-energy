create table if not exists public.browserbase_cota_coletada (
 ambiente text primary key check(ambiente in ('preview','production')),
 usado numeric check(usado>=0),
 status text not null,
 consultado_em timestamptz not null default now()
);
alter table public.browserbase_cota_coletada enable row level security;
revoke all on public.browserbase_cota_coletada from public,anon,authenticated;
grant all on public.browserbase_cota_coletada to service_role;
