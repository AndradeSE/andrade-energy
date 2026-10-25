begin;
alter table public.cemig_credenciais_preview
 add constraint cemig_cofre_empresa_fk foreign key(empresa_id) references public.empresas(id) on delete cascade,
 add constraint cemig_cofre_usuario_fk foreign key(usuario_id) references public.usuarios(id) on delete cascade;
commit;
