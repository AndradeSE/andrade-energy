import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { recoveryReadAllowed, validateRecoverySnapshot, recoveryMaxAgeMs } from './neonRecoveryPolicy';
import { recoveryStorage } from './neonRecoveryStorage';

test('recuperação permite apenas leituras auditadas, não GET com efeitos financeiros ou callbacks', () => {
  const id = 'aabbccdd-1234-1234-1234-112233445566';
  for (const path of ['/api/auth/session','/api/clientes','/api/usinas',`/api/contratos/${id}/documento`]) {
    assert.equal(recoveryReadAllowed('GET',path),true);
    for (const method of ['POST','PATCH','PUT','DELETE']) assert.equal(recoveryReadAllowed(method,path),false);
  }
  for (const path of [`/api/faturas/${id}`,'/api/oauth/google/callback','/api/cotas','/api/webhooks/asaas',
    '/api/auth/login','/api/clientes/../faturas','/api/clientes//','/api/clientes/%2e%2e/faturas']) {
    assert.equal(recoveryReadAllowed('GET',path),false);
  }
});

test('cópia vencida, futura, incompleta ou com executor de escrita não pode atender recuperação', () => {
  const now = Date.now();
  const state = {mode:'standby',captured_at:new Date(now-1000).toISOString(), completed_at:new Date(now).toISOString(),storage_ready:true,storage_manifest:[]};
  assert.ok(validateRecoverySnapshot(state,now));
  for (const change of [{mode:'active'},{mode:'review'},{storage_ready:false},{storage_manifest:null},
    {captured_at:new Date(now-recoveryMaxAgeMs-1).toISOString()}, {captured_at:new Date(now+60_000).toISOString()},
    {completed_at:new Date(now-2000).toISOString()}, {captured_at:'invalid'}]) {
    assert.throws(()=>validateRecoverySnapshot({...state,...change},now));
  }
});

test('arquivos do reserva exigem manifesto exato, conteúdo íntegro e nunca oferecem upload', async () => {
  const bytes=Buffer.from('pdf-test'), hash=createHash('sha256').update(bytes).digest('hex');
  const entry={bucket:'contratos',path:'empresa/contrato.pdf',id:'id',version:'v',size:bytes.length,content_type:'application/pdf',key:`sha256/${hash}`,sha256:hash};
  let signatures=0;
  const storage=recoveryStorage(async()=>[entry],async key=>{signatures++;assert.equal(key,entry.key);return 'https://private.test/signed';},async()=>bytes);
  const bucket=storage.from('contratos');
  assert.equal((await bucket.createSignedUrl(entry.path,999999)).data.signedUrl,'https://private.test/signed');
  assert.equal((await bucket.download(entry.path)).data.size,bytes.length);
  await assert.rejects(()=>bucket.createSignedUrl('../contrato.pdf',60));
  await assert.rejects(()=>storage.from('public').createSignedUrl(entry.path,60));
  assert.equal(signatures,1);
  assert.throws(()=>Reflect.get(bucket,'upload'));
  const corrupt=recoveryStorage(async()=>[entry],async()=>'',async()=>Buffer.from('bad'));
  await assert.rejects(()=>corrupt.from('contratos').download(entry.path));
});
