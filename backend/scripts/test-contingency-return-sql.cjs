const {PGlite}=require(process.env.PGLITE_MODULE_PATH||'@electric-sql/pglite');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create table public.contingencia_controle(id boolean primary key,executor text,revisao bigint,atualizado_em timestamptz,render_reserva_commit_validado text,render_reserva_validado_em timestamptz);
 create table public.contingencia_automacao(id boolean primary key,ativa boolean,render_service_id text,ativado_por uuid);
 create table public.contingencia_requisicoes(id int);
 create table public.contingencia_trabalhos(estado text);
 create table public.auditoria_seguranca(empresa_id uuid,usuario_id uuid,acao text,recurso text,detalhes jsonb);
 create table public.test_avisos(chave text);
 create function public.avisar_contingencia_automatica(text,text,text) returns void language sql as 'insert into public.test_avisos values($3)';`);
 await db.exec(readFileSync(resolve(__dirname,'../../supabase/migrations/20261101010000_contingencia_retorno_automatico.sql'),'utf8'));
 const commit='a'.repeat(40),service='srv-das0mmfpn0mc73ec00hg';
 async function reset(){await db.exec(`truncate contingencia_controle,contingencia_automacao,contingencia_requisicoes,contingencia_trabalhos,auditoria_seguranca,test_avisos;
 insert into contingencia_controle values(true,'RENDER_RESERVA',5,now(),'${commit}',now());
 insert into contingencia_automacao(id,ativa,render_service_id,retorno_automatico) values(true,true,'${service}',true);`);}
 const observe=async(healthy=true,hash=commit)=> (await db.query('select public.observar_retorno_render($1,$2,$3) as result',[service,healthy,hash])).rows[0].result;
 const age=async()=>db.exec("update contingencia_automacao set retorno_consulta=now()-interval '61 seconds',retorno_desde=now()-interval '121 seconds'");
 await reset(); assert.equal(await observe(),'CONFIRMANDO_RECUPERACAO');
 assert.equal(await observe(),'AGUARDANDO_INTERVALO');
 await age(); assert.equal(await observe(),'CONFIRMANDO_RECUPERACAO');
 await age(); assert.equal(await observe(),'RENDER_REATIVADO');
 assert.equal(await observe(),'PRINCIPAL_ATIVO');
 assert.equal((await db.query('select count(*)::int as n from auditoria_seguranca')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int as n from test_avisos')).rows[0].n,1);
 for(const obstacle of ["insert into contingencia_requisicoes values(1)","insert into contingencia_trabalhos values('EXECUTANDO')","insert into contingencia_trabalhos values('REVISAO')"]){
   await reset(); await observe(); await age(); await observe(); await age(); await db.exec(obstacle);
   assert.equal(await observe(),'AGUARDANDO_OPERACOES');
   assert.equal((await db.query('select executor from contingencia_controle')).rows[0].executor,'RENDER_RESERVA');
 }
 await reset(); await observe(); await age(); assert.equal(await observe(false),'PRINCIPAL_NAO_VALIDADO');
 assert.equal((await db.query('select retorno_observacoes as n from contingencia_automacao')).rows[0].n,0);
 await age(); assert.equal(await observe(true,'b'.repeat(40)),'PRINCIPAL_NAO_VALIDADO');
 await reset(); await observe(); await age(); await observe(); await age();
 await db.exec('update contingencia_controle set revisao=6');
 assert.equal(await observe(),'CONFIRMANDO_RECUPERACAO');
 await reset(); await db.exec('update contingencia_automacao set retorno_automatico=false');assert.equal(await observe(),'DESATIVADA');
 await reset(); await assert.rejects(db.query('select public.observar_retorno_render($1,true,$2)',['wrong',commit]),/Serviço divergente/);
 assert.equal((await db.query("select has_function_privilege('anon','public.observar_retorno_render(text,boolean,text)','EXECUTE') as allowed")).rows[0].allowed,false);
 console.log('SQL: retorno, espaçamento, idempotência, bloqueios, recuperação, versão, revisão e permissões aprovados.');
 await db.close();
})().catch(e=>{console.error(e);process.exit(1);});
