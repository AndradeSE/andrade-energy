import assert from 'node:assert/strict';
import {test} from 'node:test';
import {forwardProviderIngress,isProviderIngress} from './contingencyIngress';
test('provider relay preserves signed bytes and signatures without accepting a caller destination',async()=>{
  const bytes=Buffer.from('{ "type": "email.received", "value": "á" }');
  let calls=0;
  const request=(async(url:any,input:any)=>{
    calls++;
    assert.equal(url,'https://andrade-energy-api-homologacao.onrender.com/api/webhooks/resend');
    assert.deepEqual(input.body,bytes);
    assert.equal(input.headers['svix-signature'],'signed');
    assert.equal(input.headers.host,undefined);
    assert.equal(input.headers.authorization,undefined);
    assert.equal(input.redirect,'error');
    return new Response('{"ok":true}',{status:202});
  }) as typeof fetch;
  const result=await forwardProviderIngress({httpMethod:'POST',path:'/api/webhooks/resend',isBase64Encoded:true,body:bytes.toString('base64'),headers:{'Svix-Signature':'signed',host:'evil.test',authorization:'unrelated'}},'preview',request);
  assert.equal(result.statusCode,202);assert.equal(calls,1);
  assert.equal(isProviderIngress('GET','/api/webhooks/resend'),false);
  assert.equal(isProviderIngress('POST','/api/asaas/cobrancas'),false);
});
test('provider outage never replays a webhook inside the relay',async()=>{
  let calls=0;
  const request=(async()=>{calls++;throw new Error('offline');}) as typeof fetch;
  await assert.rejects(forwardProviderIngress({httpMethod:'POST',path:'/api/webhooks/asaas',body:'{}'},'production',request),/offline/);
  assert.equal(calls,1);
});
