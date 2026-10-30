-- Publica novas versoes sem alterar documentos ja aceitos pelos usuarios.
do $contato$
declare
  documento record;
begin
  for documento in
    select id, tipo, titulo, conteudo
    from public.documentos_comerciais
    where tipo in ('TERMOS_USO', 'POLITICA_PRIVACIDADE', 'POLITICA_CANCELAMENTO')
      and ativo = true
      and conteudo like '%contato@andradeenergy.com.br%'
  loop
    if not exists (
      select 1 from public.documentos_comerciais
      where tipo = documento.tipo and versao = '1.2'
    ) then
      update public.documentos_comerciais
      set ativo = false
      where id = documento.id;

      insert into public.documentos_comerciais
        (tipo, titulo, versao, conteudo, ativo, publicado_em)
      values
        (documento.tipo, documento.titulo, '1.2',
         replace(documento.conteudo, 'contato@andradeenergy.com.br', 'andradeenergyltda@gmail.com'),
         true, now());
    end if;
  end loop;
end;
$contato$;
