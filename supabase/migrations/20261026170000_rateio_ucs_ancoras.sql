begin;
create table public.rateio_ucs_ancoras (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.empresas(id),
 numero text not null check(numero ~ '^[0-9]{6,20}$'),
 apelido text not null default '' check(char_length(apelido)<=80),
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 excluido_em timestamptz
);
create unique index rateio_ucs_ancoras_numero on public.rateio_ucs_ancoras(empresa_id,numero) where excluido_em is null;
alter table public.rateio_ucs_ancoras enable row level security;
revoke all on public.rateio_ucs_ancoras from anon,authenticated;
grant all on public.rateio_ucs_ancoras to service_role;
-- Preserve existing selections; no changes to allocations or generated files.
insert into public.rateio_ucs_ancoras(empresa_id,numero)
select distinct empresa_id,uc_ancora from public.rateio_configuracoes where uc_ancora<>'';
commit;
