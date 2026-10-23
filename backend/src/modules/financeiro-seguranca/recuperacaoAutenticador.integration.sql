-- Run only against homologation. All fixtures and audit rows are rolled back.
begin;
do $$
declare
  uid uuid:=gen_random_uuid(); cid uuid:=gen_random_uuid(); anterior uuid;
  empresa uuid:='00000000-0000-4000-8000-000000000001'; resultado text; i integer;
begin
  if has_function_privilege('anon','public.confirmar_recuperacao_financeira(uuid,uuid,uuid,text)','execute')
    or has_function_privilege('authenticated','public.iniciar_recuperacao_financeira(uuid,uuid,uuid,text,text,text,text)','execute') then raise exception 'RPC exposta'; end if;
  insert into public.usuarios(id,nome,email,senha,perfil,ativo,empresa_id)
    values(uid,'Teste recuperação descartável',uid||'@example.invalid','senha-fixture','ADMIN',true,empresa);
  insert into public.empresa_usuarios(usuario_id,empresa_id,papel,ativo) values(uid,empresa,'ADMIN_EMPRESA',true) on conflict do nothing;
  insert into public.financeiro_autenticadores(usuario_id,segredo_criptografado,confirmado,email_recuperacao) values(uid,'segredo-fixture',true,uid||'@example.invalid');
  if public.iniciar_recuperacao_financeira(uid,empresa,cid,uid||'@example.invalid',encode(sha256(convert_to('senha-fixture','UTF8')),'hex'),encode(sha256(convert_to('segredo-fixture','UTF8')),'hex'),repeat('a',64))<>'OK' then raise exception 'Inicio falhou'; end if;
  if public.iniciar_recuperacao_financeira(uid,empresa,gen_random_uuid(),uid||'@example.invalid',encode(sha256(convert_to('senha-fixture','UTF8')),'hex'),encode(sha256(convert_to('segredo-fixture','UTF8')),'hex'),repeat('b',64))<>'AGUARDE' then raise exception 'Cooldown ausente'; end if;
  if public.confirmar_recuperacao_financeira(uid,empresa,cid,null)<>'INVALIDO' then raise exception 'Null aceito'; end if;
  if public.confirmar_recuperacao_financeira(uid,gen_random_uuid(),cid,repeat('a',64))<>'INVALIDO' then raise exception 'Empresa trocada'; end if;
  anterior:=cid; cid:=gen_random_uuid();
  update public.financeiro_recuperacoes set criado_em=now()-interval '2 minutes' where usuario_id=uid;
  resultado:=public.iniciar_recuperacao_financeira(uid,empresa,cid,uid||'@example.invalid',encode(sha256(convert_to('senha-fixture','UTF8')),'hex'),encode(sha256(convert_to('segredo-fixture','UTF8')),'hex'),repeat('b',64));
  if resultado<>'OK' then raise exception 'Reenvio falhou'; end if;
  if public.confirmar_recuperacao_financeira(uid,empresa,anterior,repeat('a',64))<>'INVALIDO' then raise exception 'Codigo anterior aceito'; end if;
  for i in 1..5 loop
    if public.confirmar_recuperacao_financeira(uid,empresa,cid,repeat('a',64))<>'INVALIDO' then raise exception 'Codigo errado aceito'; end if;
  end loop;
  if (select tentativas from public.financeiro_recuperacoes where usuario_id=uid)<>5 then raise exception 'Tentativas nao contabilizadas'; end if;
  if public.confirmar_recuperacao_financeira(uid,empresa,cid,repeat('b',64))<>'INVALIDO' then raise exception 'Limite ignorado'; end if;
  if not(select confirmado from public.financeiro_autenticadores where usuario_id=uid) then raise exception 'Erros desativaram fator'; end if;
  cid:=gen_random_uuid();
  update public.financeiro_recuperacoes set criado_em=now()-interval '2 minutes' where usuario_id=uid;
  resultado:=public.iniciar_recuperacao_financeira(uid,empresa,cid,uid||'@example.invalid',encode(sha256(convert_to('senha-fixture','UTF8')),'hex'),encode(sha256(convert_to('segredo-fixture','UTF8')),'hex'),repeat('c',64));
  if resultado<>'OK' then raise exception 'Terceiro envio falhou'; end if;
  update public.usuarios set email=uid||'-alterado@example.invalid' where id=uid;
  if public.confirmar_recuperacao_financeira(uid,empresa,cid,repeat('c',64))<>'INVALIDO' then raise exception 'Email alterado ignorado'; end if;
  update public.usuarios set email=uid||'@example.invalid' where id=uid;
  update public.financeiro_recuperacoes set envios=5,criado_em=now()-interval '2 minutes' where usuario_id=uid;
  if public.iniciar_recuperacao_financeira(uid,empresa,gen_random_uuid(),uid||'@example.invalid',encode(sha256(convert_to('senha-fixture','UTF8')),'hex'),encode(sha256(convert_to('segredo-fixture','UTF8')),'hex'),repeat('d',64))<>'LIMITE' then raise exception 'Limite de envios ausente'; end if;
  update public.financeiro_recuperacoes set expira_em=now()-interval '1 second' where usuario_id=uid;
  if public.confirmar_recuperacao_financeira(uid,empresa,cid,repeat('c',64))<>'INVALIDO' then raise exception 'Expirado aceito'; end if;
  update public.financeiro_recuperacoes set expira_em=now()+interval '1 minute' where usuario_id=uid;
  update public.usuarios set senha='outra-senha' where id=uid;
  if public.confirmar_recuperacao_financeira(uid,empresa,cid,repeat('c',64))<>'INVALIDO' then raise exception 'Senha alterada ignorada'; end if;
  update public.usuarios set senha='senha-fixture' where id=uid;
  update public.financeiro_autenticadores set segredo_criptografado='outro-segredo' where usuario_id=uid;
  if public.confirmar_recuperacao_financeira(uid,empresa,cid,repeat('c',64))<>'INVALIDO' then raise exception 'Fator alterado ignorado'; end if;
  update public.financeiro_autenticadores set segredo_criptografado='segredo-fixture' where usuario_id=uid;
  if public.confirmar_recuperacao_financeira(uid,empresa,cid,repeat('c',64))<>'OK' then raise exception 'Confirmacao falhou'; end if;
  if (select confirmado from public.financeiro_autenticadores where usuario_id=uid) then raise exception 'Fator anterior ativo'; end if;
  if public.confirmar_recuperacao_financeira(uid,empresa,cid,repeat('c',64))<>'INVALIDO' then raise exception 'Replay aceito'; end if;
  if (select count(*) from public.auditoria_seguranca where usuario_id=uid and acao='TOTP_RECUPERACAO_CONFIRMADA')<>1 then raise exception 'Auditoria ausente'; end if;
end $$;
rollback;
select 'recuperacao: isolamento, cooldown, reenvio, cinco tentativas, expiracao, senha/fator alterados, uso unico, auditoria: OK' as resultado;
