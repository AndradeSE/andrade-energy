alter table public.rateio_configuracoes add column if not exists ucs_confirmadas text[] not null default '{}';
