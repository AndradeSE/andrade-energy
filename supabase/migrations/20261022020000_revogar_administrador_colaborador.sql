-- Executada somente pelo backend, com validação e auditoria atômicas.
create or replace function public.promover_colaborador_administrador(
  p_ator uuid, p_empresa uuid, p_vinculo uuid, p_escopo text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ator public.usuarios%rowtype;
  papel_ator text;
  alvo public.empresa_usuarios%rowtype;
  conta public.usuarios%rowtype;
  perfil_novo text;
begin
  if p_escopo not in ('EMPRESA', 'COMERCIAL', 'COMPLETO') or p_escopo is null then raise exception 'Escopo inválido.'; end if;
  select * into ator from public.usuarios where id = p_ator and ativo = true for update;
  if not found then raise exception 'Administrador não autorizado.'; end if;
  select papel into papel_ator from public.empresa_usuarios
    where usuario_id = p_ator and empresa_id = p_empresa and ativo = true for update;
  if papel_ator is null or papel_ator not in ('ADMIN_EMPRESA','GESTOR','SUPERADMIN') or coalesce(ator.perfil::text,'') not in ('ADMIN','GESTOR') then
    raise exception 'Administrador não autorizado nesta empresa.';
  end if;
  if p_escopo = 'COMERCIAL' and (p_empresa <> '00000000-0000-4000-8000-000000000001'::uuid or ator.perfil <> 'ADMIN' or ator.empresa_id <> p_empresa) then
    raise exception 'Somente o ADM Andrade pode conceder administração comercial.';
  end if;
  if p_escopo = 'COMPLETO' and p_empresa = '00000000-0000-4000-8000-000000000001'::uuid and (ator.perfil <> 'ADMIN' or ator.empresa_id <> p_empresa) then raise exception 'Somente o ADM Andrade pode conceder acesso completo Andrade.'; end if;
  select * into alvo from public.empresa_usuarios where id = p_vinculo and empresa_id = p_empresa for update;
  if not found or not alvo.ativo or alvo.usuario_id = p_ator or alvo.papel not in ('COLABORADOR_GERADOR','COLABORADOR_COMERCIAL') then
    raise exception 'Colaborador ativo não encontrado nesta empresa.';
  end if;
  if alvo.papel = 'COLABORADOR_COMERCIAL' and (ator.perfil <> 'ADMIN' or p_empresa <> '00000000-0000-4000-8000-000000000001'::uuid) then
    raise exception 'Somente o ADM Andrade pode alterar a equipe comercial.';
  end if;
  select * into conta from public.usuarios where id = alvo.usuario_id and ativo = true for update;
  if not found or conta.empresa_id is distinct from p_empresa then
    raise exception 'A conta tem outra empresa principal. Revise seus vínculos antes da promoção.';
  end if;
  if exists(select 1 from public.empresa_usuarios where usuario_id = alvo.usuario_id and empresa_id <> p_empresa and ativo = true) then
    raise exception 'A conta possui acesso a outras empresas. Revise seus vínculos antes da promoção.';
  end if;
  perfil_novo := case when p_escopo in ('COMERCIAL','COMPLETO') then 'ADMIN' else 'GESTOR' end;
  if p_escopo in ('COMERCIAL','COMPLETO') then
    update public.usuarios set perfil = 'ADMIN' where id = alvo.usuario_id;
  else
    update public.usuarios set perfil = 'GESTOR' where id = alvo.usuario_id;
  end if;
  update public.empresa_usuarios set papel = 'ADMIN_EMPRESA',
    permissoes = jsonb_build_object('escopo_administrativo', p_escopo, 'papel_colaborador_origem', alvo.papel), atualizado_em = now() where id = alvo.id;
  insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,recurso_id,detalhes)
    values(p_empresa,p_ator,'COLABORADOR_PROMOVIDO_ADMIN','empresa_usuarios',alvo.id,
      jsonb_build_object('usuario_promovido',alvo.usuario_id,'escopo',p_escopo,'papel_anterior',alvo.papel,'perfil_anterior',conta.perfil,'perfil_novo',perfil_novo));
  update public.sessoes_usuarios set revogada_em = now() where usuario_id = alvo.usuario_id and revogada_em is null;
  return jsonb_build_object('sucesso',true,'escopo',p_escopo,'novo_login_necessario',true);
end;
$$;
revoke all on function public.promover_colaborador_administrador(uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.promover_colaborador_administrador(uuid,uuid,uuid,text) to service_role;

-- Somente administradores originados de promoção de colaborador podem retornar.
create or replace function public.revogar_administrador_colaborador(
  p_ator uuid, p_empresa uuid, p_vinculo uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ator public.usuarios%rowtype;
  alvo public.empresa_usuarios%rowtype;
  conta public.usuarios%rowtype;
  papel_ator text;
  papel_anterior text;
begin
  select * into ator from public.usuarios where id=p_ator and ativo=true for update;
  if not found or ator.empresa_id is distinct from p_empresa or ator.perfil::text not in ('ADMIN','GESTOR') then
    raise exception 'Administrador não autorizado.';
  end if;
  select papel into papel_ator from public.empresa_usuarios where usuario_id=p_ator and empresa_id=p_empresa and ativo=true for update;
  if papel_ator is null or papel_ator not in ('ADMIN_EMPRESA','GESTOR','SUPERADMIN')
     or (p_empresa='00000000-0000-4000-8000-000000000001'::uuid and ator.perfil::text <> 'ADMIN') then
    raise exception 'Administrador não autorizado nesta empresa.';
  end if;
  select * into alvo from public.empresa_usuarios where id=p_vinculo and empresa_id=p_empresa for update;
  if not found or alvo.usuario_id=p_ator or alvo.papel <> 'ADMIN_EMPRESA' or not alvo.ativo or alvo.principal then
    raise exception 'Selecione outro administrador promovido de colaborador.';
  end if;
  papel_anterior := alvo.permissoes->>'papel_colaborador_origem';
  if papel_anterior is null then
  select detalhes->>'papel_anterior' into papel_anterior from public.auditoria_seguranca
    where empresa_id=p_empresa and recurso_id=alvo.id and acao='COLABORADOR_PROMOVIDO_ADMIN'
    order by criado_em desc, id desc limit 1;
  end if;
  if papel_anterior is null or papel_anterior not in ('COLABORADOR_COMERCIAL','COLABORADOR_GERADOR') then
    raise exception 'Este acesso não se originou de promoção de colaborador.';
  end if;
  select * into conta from public.usuarios where id=alvo.usuario_id and ativo=true for update;
  if not found or conta.empresa_id is distinct from p_empresa or exists(
    select 1 from public.empresa_usuarios where usuario_id=alvo.usuario_id and empresa_id<>p_empresa and ativo=true
  ) then raise exception 'Revise os vínculos desta conta antes de remover o acesso ADM.'; end if;
  -- Reinicia sem permissões; o titular seleciona os acessos operacionais depois.
  update public.usuarios set perfil='GESTOR' where id=alvo.usuario_id;
  update public.empresa_usuarios set papel=papel_anterior,
    permissoes='{"geradores":false,"monitoramento":false,"documentos":false,"usinas":false,"clientes":false,"unidades":false,"contratos":false,"faturas":false,"operacao":false}'::jsonb,
    atualizado_em=now() where id=alvo.id;
  insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,recurso_id,detalhes)
    values(p_empresa,p_ator,'COLABORADOR_ADMIN_REVOGADO','empresa_usuarios',alvo.id,
      jsonb_build_object('usuario_alterado',alvo.usuario_id,'papel_novo',papel_anterior,'permissoes_reiniciadas',true));
  update public.sessoes_usuarios set revogada_em=now() where usuario_id=alvo.usuario_id and revogada_em is null;
  return jsonb_build_object('sucesso',true,'papel',papel_anterior,'novo_login_necessario',true);
end;
$$;
revoke all on function public.revogar_administrador_colaborador(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.revogar_administrador_colaborador(uuid,uuid,uuid) to service_role;

