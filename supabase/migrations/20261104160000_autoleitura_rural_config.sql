alter table public.unidades_consumidoras
  add column if not exists zona_localizacao text,
  add column if not exists autoleitura_rural_ativa boolean not null default false;

alter table public.unidades_consumidoras
  add constraint unidades_consumidoras_zona_localizacao_check
    check (zona_localizacao in ('RURAL', 'URBANA')),
  add constraint unidades_consumidoras_autoleitura_rural_check
    check (not autoleitura_rural_ativa or zona_localizacao is not distinct from 'RURAL');

comment on column public.unidades_consumidoras.zona_localizacao is
  'Zona declarada no cadastro da UC. Nulo indica classificação ainda não informada.';
comment on column public.unidades_consumidoras.autoleitura_rural_ativa is
  'Habilita o fluxo de autoleitura desta UC rural após ativação no cadastro.';
