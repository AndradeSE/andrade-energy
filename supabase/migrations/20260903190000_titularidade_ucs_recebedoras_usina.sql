alter table public.usinas
  add column if not exists titularidade_ucs_recebedoras text not null default 'GERADOR';

alter table public.usinas
  drop constraint if exists usinas_titularidade_ucs_recebedoras_check;

alter table public.usinas
  add constraint usinas_titularidade_ucs_recebedoras_check
  check (titularidade_ucs_recebedoras in ('GERADOR', 'CLIENTE'));

update public.usinas u
set titularidade_ucs_recebedoras = 'CLIENTE'
where exists (
  select 1
  from public.clientes c
  where c.usina_id = u.id
    and c.titularidade_faturamento = 'CLIENTE'
);

comment on column public.usinas.titularidade_ucs_recebedoras is
  'Titularidade das UCs recebedoras vinculadas à usina: GERADOR ou CLIENTE.';
