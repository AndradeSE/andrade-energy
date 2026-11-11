import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import type { Server } from 'node:http';
import { Client } from 'pg';
import { neonPreviewConnection } from './neonSnapshotRuntime';
import { initializeNeonRecovery } from './neonRecoveryRuntime';
import { recoveryStatus } from './neonRecoveryState';
import { supabase, withRecoveryClient } from './supabase';
import { createNeonFailoverMonitor } from './neonFailoverMonitor';
import { hashToken } from '../utils/token';
import { prepareRecoveryEvents, publishRecoveryTransition } from './neonRecoveryEvents';

/** A short-lived session exists only in the isolated replica; no login/provider or business mutation. */
export async function verifyNeonRecovery(env: NodeJS.ProcessEnv, automatic = false) {
  const pg=new Client(neonPreviewConnection(env));
  const sessionId=randomUUID(), token=randomBytes(32).toString('hex');
  const eventEnv={...env,RENDER_SERVICE_ID:`probe-${sessionId}`};
  const eventInstance=createHash('sha256').update(eventEnv.RENDER_SERVICE_ID).digest('hex');
  let recovery: Awaited<ReturnType<typeof initializeNeonRecovery>> = null;
  let server: Server | null=null;
  let primaryHealthy = false;
  const transitions: string[] = [];
  const tick = createNeonFailoverMonitor({
    probePrimary: async () => primaryHealthy,
    activate: async () => {
      recovery = await initializeNeonRecovery({...env,NEON_RECOVERY_READ_ONLY:'true',API_RUNTIME:'render',API_DISTRIBUTED_RATE_LIMIT:'false'}, true);
      return recovery;
    },
    onTransition: async provider => { transitions.push(provider); },
  });
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
    if (automatic) {
      await tick();
      assert.equal(recoveryStatus().banco, 'SUPABASE');
      await tick();
      assert.equal(recoveryStatus().banco, 'NEON');
      const outsideRequest = await supabase.from('sessoes_usuarios').select('id').eq('id',sessionId);
      assert.equal(outsideRequest.error, null);
      assert.equal(outsideRequest.data!.length, 0, 'background work must stay on the primary');
    } else {
      recovery=await initializeNeonRecovery({...env,NEON_RECOVERY_READ_ONLY:'true',API_RUNTIME:'render',API_DISTRIBUTED_RATE_LIMIT:'false'});
    }
    // Import the real router without opening the production port or starting jobs.
    // The recovery instance uses local rate limits; distributed counters would be writes.
    const previousRuntime=process.env.API_RUNTIME,previousLimits=process.env.API_DISTRIBUTED_RATE_LIMIT;
    let application: typeof import('../server');
    try {
      process.env.API_RUNTIME='render';process.env.API_DISTRIBUTED_RATE_LIMIT='false';
      application=await import('../server.js');
    } finally {
      if(previousRuntime===undefined) delete process.env.API_RUNTIME;else process.env.API_RUNTIME=previousRuntime;
      if(previousLimits===undefined) delete process.env.API_DISTRIBUTED_RATE_LIMIT;else process.env.API_DISTRIBUTED_RATE_LIMIT=previousLimits;
    }
    await application.validarSchemaAntesDeIniciar();
    const app=application.app;
    await new Promise<void>(resolve=>{server=app.listen(0,'127.0.0.1',resolve);});
    const address=server!.address();
    if(!address || typeof address==='string') throw new Error('Porta de conferência indisponível');
    const origin=`http://127.0.0.1:${address.port}`;
    const request=(path:string,method='GET',auth=true)=>fetch(origin+path,{method,
      headers:auth?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(15_000)});
    const health=await request('/health','GET',false);
    assert.equal(health.status,200);assert.equal((await health.json() as any).status,'read-only');
    assert.equal((await request('/api/auth/session','GET',false)).status,401);
    const session=await request('/api/auth/session');
    assert.equal(session.status,200);assert.equal((await session.json() as any).usuario.id,user.id);
    const clients=await request('/api/clientes');assert.equal(clients.status,200);
    const clientsBody=await clients.json() as any[];
    assert.ok(Array.isArray(clientsBody));
    assert.ok(clientsBody.every(row=>row.empresa_id===user.empresa_id));
    const {rows:[count]}=await pg.query('SELECT count(*) AS n FROM public.clientes WHERE empresa_id=$1',[user.empresa_id]);
    assert.equal(clientsBody.length,Number(count.n));
    assert.equal((await request('/api/clientes','POST')).status,503);
    assert.equal((await request('/api/faturas/gerar')).status,503);
    const {rows:[snapshot]}=await pg.query('SELECT storage_manifest FROM reserve_control.snapshot_state WHERE id=1');
    const document=snapshot.storage_manifest.find((item:any)=>item.bucket==='contratos');
    assert.ok(document);
    const file=await withRecoveryClient(recovery!.client, () => supabase.storage.from('contratos').download(document.path));
    assert.equal(file.error,null);assert.equal(file.data!.size,document.size);
    const signed=await withRecoveryClient(recovery!.client, () => supabase.storage.from('contratos').createSignedUrl(document.path,300));
    assert.equal(signed.error,null);
    const downloaded=await fetch(signed.data!.signedUrl,{redirect:'error',signal:AbortSignal.timeout(15_000)});
    assert.equal(downloaded.status,200);
    assert.equal((await downloaded.arrayBuffer()).byteLength,document.size);
    const paths=snapshot.storage_manifest.filter((item:any)=>item.bucket==='contratos').map((item:any)=>item.path);
    const {rows:[contract]}=await pg.query(`SELECT id FROM public.contratos WHERE empresa_id=$1
      AND coalesce(nullif(contrato_assinado_url,''),nullif(contrato_gerado_url,''),nullif(arquivo_pdf,'')) IS NOT NULL
      AND (contrato_assinado_url IS NULL OR contrato_assinado_url='' OR contrato_assinado_url=ANY($2))
      AND (contrato_gerado_url IS NULL OR contrato_gerado_url='' OR contrato_gerado_url=ANY($2))
      AND (arquivo_pdf IS NULL OR arquivo_pdf='' OR arquivo_pdf=ANY($2)) LIMIT 1`,[user.empresa_id,paths]);
    assert.ok(contract);
    const contractResponse=await request(`/api/contratos/${contract.id}/documento`);
    assert.equal(contractResponse.status,200);
    const contractBody=await contractResponse.json() as any;
    assert.ok(contractBody.contrato_assinado_url || contractBody.contrato_gerado_url || contractBody.arquivo_pdf);
    const {rows:[before]}=await pg.query('SELECT expira_em FROM public.sessoes_usuarios WHERE id=$1',[sessionId]);
    assert.equal((await request('/api/auth/session')).status,200);
    const {rows:[after]}=await pg.query('SELECT expira_em FROM public.sessoes_usuarios WHERE id=$1',[sessionId]);
    assert.equal(new Date(after.expira_em).getTime(),new Date(before.expira_em).getTime());
    await pg.query('UPDATE public.sessoes_usuarios SET revogada_em=now() WHERE id=$1',[sessionId]);
    assert.equal((await request('/api/auth/session')).status,401);
    assert.equal(recoveryStatus().banco,'NEON');
    if (automatic) {
      primaryHealthy = true;
      await tick();
      assert.equal(recoveryStatus().banco,'NEON');
      await tick();
      assert.equal(recoveryStatus().banco,'SUPABASE');
      assert.deepEqual(transitions,['NEON','SUPABASE']);
    }
    return {automatic, returnedToPrimary: automatic, realHttpRouter:true,authenticated:true,tenantScoped:true,mutationsBlocked:true,revocationChecked:true,slidingSessionDisabled:true,transitionDeduplicated:true,privateFilesAdapted:true};
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
