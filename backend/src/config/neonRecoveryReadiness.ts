import { automaticRecoveryEnabled } from "./neonFailoverMonitor";
import { Client } from 'pg';
import { neonPreviewConnection } from './neonSnapshotRuntime';
import { recoveryStatus } from './neonRecoveryState';
import { validateRecoverySnapshot } from './neonRecoveryPolicy';

export async function neonRecoveryReadiness(env: NodeJS.ProcessEnv) {
  const active=recoveryStatus();
  if (!env.NEON_DATABASE_URL) return {...active,reservaConfigurada:false,trocaAutomatica:false};
  let client: Client | undefined;
  try {
    const config=neonPreviewConnection(env);
    client=new Client({...config,connectionTimeoutMillis:2000,statement_timeout:2000});
    await client.connect();
    const {rows:[state]}=await client.query('SELECT mode,captured_at,completed_at,storage_ready,storage_manifest FROM reserve_control.snapshot_state WHERE id=1');
    const usage=await client.query("SELECT pg_database_size(current_database())::text AS bytes").catch(()=>null);
    const databaseBytes=Number(usage?.rows[0]?.bytes);
    let ready=false;
    try { validateRecoverySnapshot(state);ready=true; } catch { /* An old backup is not an available fallback. */ }
    return {...active,reservaConfigurada:true,trocaAutomatica:automaticRecoveryEnabled(env),prontaParaConsulta:ready,
      bancoBytes:Number.isSafeInteger(databaseBytes) && databaseBytes >= 0 ? databaseBytes : null,
      ultimaCopia:state?.captured_at ?? null,documentosProntos:state?.storage_ready===true,
      destino:'NEON',limitacao:'Somente consulta; gravações e operações automáticas bloqueadas na recuperação.'};
  } catch { return {...active,reservaConfigurada:true,trocaAutomatica:automaticRecoveryEnabled(env),prontaParaConsulta:false,consultaIndisponivel:true}; }
  finally { if(client) await client.end().catch(()=>{}); }
}
