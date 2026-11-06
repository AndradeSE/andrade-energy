import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import express from 'express';
import { Client } from 'pg';
import { neonPreviewConnection } from './neonSnapshotRuntime';
import { initializeNeonRecovery, neonRecoveryGuard } from './neonRecoveryRuntime';
import { recoveryStatus } from './neonRecoveryState';
import { exigirAutenticacao } from '../middlewares/auth.middleware';
import { supabase } from './supabase';
import { hashToken } from '../utils/token';
import { publicSessionUser } from '../modules/auth/session';
import { prepareRecoveryEvents, publishRecoveryTransition } from './neonRecoveryEvents';

/** A short-lived session exists only in the isolated replica; no login/provider or business mutation. */
export async function verifyNeonRecovery(env: NodeJS.ProcessEnv) {
  const pg=new Client(neonPreviewConnection(env));
  const sessionId=randomUUID(), token=randomBytes(32).toString('hex');
  const eventEnv={...env,RENDER_SERVICE_ID:`probe-${sessionId}`};
  const eventInstance=createHash('sha256').update(eventEnv.RENDER_SERVICE_ID).digest('hex');
  let recovery: Awaited<ReturnType<typeof initializeNeonRecovery>> = null;
  let server: ReturnType<express.Express['listen']> | null=null;
  try {
    await prepareRecoveryEvents(env);
    await pg.connect();
    await publishRecoveryTransition(eventEnv,'SUPABASE',{deliver:false});
    const countNotices=async()=>Number((await pg.query('SELECT count(*) AS n FROM reserve_control.recovery_notice WHERE instance_key=$1',[eventInstance])).rows[0].n);
    assert.equal(await countNotices(),0);
    await publishRecoveryTransition(eventEnv,'NEON',{deliver:false});
    const firstNotices=await countNotices();
    assert.ok(firstNotices>0);
    await publishRecoveryTransition(eventEnv,'NEON',{deliver:false});
    assert.equal(await countNotices(),firstNotices);
    await publishRecoveryTransition(eventEnv,'SUPABASE',{deliver:false});
    assert.equal(await countNotices(),2*firstNotices);
    const {rows:[user]}=await pg.query(`SELECT u.id,e.empresa_id FROM public.usuarios u
      JOIN public.empresa_usuarios e ON e.usuario_id=u.id AND e.ativo=true
      WHERE u.ativo=true AND u.perfil='ADMIN' ORDER BY u.id LIMIT 1`);
    if(!user) throw new Error('Preview sem administrador para conferir a recuperação');
    await pg.query(`INSERT INTO public.sessoes_usuarios(id,usuario_id,empresa_ativa_id,token_hash,expira_em)
      VALUES($1,$2,$3,$4,now()+interval '3 minutes')`,[sessionId,user.id,user.empresa_id,hashToken(token)]);
    recovery=await initializeNeonRecovery({...env,NEON_RECOVERY_READ_ONLY:'true',API_RUNTIME:'render',API_DISTRIBUTED_RATE_LIMIT:'false'},{notify:false});
    const app=express();
    app.use(neonRecoveryGuard);
    app.get('/api/auth/session',exigirAutenticacao,(req,res)=>res.json({usuario:publicSessionUser((req as any).usuario)}));
    app.get('/api/clientes',exigirAutenticacao,async(req,res)=>{
      const result=await supabase.from('clientes').select('id,empresa_id').eq('empresa_id',(req as any).empresaId);
      if(result.error) return res.status(500).json({message:'Consulta recusada'});
      return res.json(result.data);
    });
    // A blocked route must never reach its handler, even for GET.
    let effects=0;
    app.all('/api/faturas/gerar',(_req,res)=>{effects++;res.json({});});
    await new Promise<void>(resolve=>{server=app.listen(0,'127.0.0.1',resolve);});
    const address=server!.address();
    if(!address || typeof address==='string') throw new Error('Porta de conferência indisponível');
    const origin=`http://127.0.0.1:${address.port}`;
    const request=(path:string,method='GET',auth=true)=>fetch(origin+path,{method,
      headers:auth?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(15_000)});
    assert.equal((await request('/api/auth/session','GET',false)).status,401);
    const session=await request('/api/auth/session');
    assert.equal(session.status,200);assert.equal((await session.json() as any).usuario.id,user.id);
    const clients=await request('/api/clientes');assert.equal(clients.status,200);
    assert.ok((await clients.json() as any[]).every(row=>row.empresa_id===user.empresa_id));
    assert.equal((await request('/api/clientes','POST')).status,503);
    assert.equal((await request('/api/faturas/gerar')).status,503);
    assert.equal(effects,0);
    const {rows:[before]}=await pg.query('SELECT expira_em FROM public.sessoes_usuarios WHERE id=$1',[sessionId]);
    assert.equal((await request('/api/auth/session')).status,200);
    const {rows:[after]}=await pg.query('SELECT expira_em FROM public.sessoes_usuarios WHERE id=$1',[sessionId]);
    assert.equal(new Date(after.expira_em).getTime(),new Date(before.expira_em).getTime());
    await pg.query('UPDATE public.sessoes_usuarios SET revogada_em=now() WHERE id=$1',[sessionId]);
    assert.equal((await request('/api/auth/session')).status,401);
    assert.equal(recoveryStatus().banco,'NEON');
    return {authenticated:true,tenantScoped:true,mutationsBlocked:true,revocationChecked:true,slidingSessionDisabled:true,transitionDeduplicated:true};
  } finally {
    if(server) await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
    recovery?.stop();
    try {
      await pg.query('DELETE FROM public.sessoes_usuarios WHERE id=$1 AND token_hash=$2',[sessionId,hashToken(token)]);
      await pg.query('DELETE FROM reserve_control.recovery_notice WHERE instance_key=$1',[eventInstance]);
      await pg.query('DELETE FROM reserve_control.recovery_instance WHERE instance_key=$1',[eventInstance]);
    }
    finally { await pg.end(); }
  }
}
