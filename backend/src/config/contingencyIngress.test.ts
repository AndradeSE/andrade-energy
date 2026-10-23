import assert from 'node:assert/strict';
import {test} from 'node:test';
import {forwardProviderIngress,isProviderIngress,forwardOAuthIngress,isOAuthIngress} from './contingencyIngress';
test('provider relay preserves signed bytes and signatures without accepting a caller destination',async()=>{
  const bytes=Buffer.from('{ "type": "email.received", "value": "á" }');
  let calls=0;
  const request=(async(url:any,input:any)=>{
    calls++;
    assert.equal(url,'https://andrade-energy-api-homologacao.onrender.com/api/webhooks/resend/inbound');
    assert.deepEqual(input.body,bytes);
    assert.equal(input.headers['svix-signature'],'signed');
    assert.equal(input.headers.host,undefined);
    assert.equal(input.headers.authorization,undefined);
    assert.equal(input.redirect,'error');
    return new Response('{"ok":true}',{status:202});
  }) as typeof fetch;
  const result=await forwardProviderIngress({httpMethod:'POST',path:'/api/webhooks/resend/inbound',isBase64Encoded:true,body:bytes.toString('base64'),headers:{'Svix-Signature':'signed',host:'evil.test',authorization:'unrelated'}},'preview',request);
  assert.equal(result.statusCode,202);assert.equal(calls,1);
  assert.equal(isProviderIngress('GET','/api/webhooks/resend'),false);
  assert.equal(isProviderIngress('POST','/api/asaas/cobrancas'),false);
  assert.equal(isProviderIngress('POST','/api/webhooks/resend'),false);
});
test('provider outage never replays a webhook inside the relay',async()=>{
  let calls=0;
  const request=(async()=>{calls++;throw new Error('offline');}) as typeof fetch;
  await assert.rejects(forwardProviderIngress({httpMethod:'POST',path:'/api/webhooks/asaas',body:'{}'},'production',request),/offline/);
  assert.equal(calls,1);
});
test('OAuth codes reach only the fixed primary once and app redirects are not fetched', async () => {
  let calls = 0;
  const result = await forwardOAuthIngress({httpMethod:'GET',path:'/api/oauth/email/callback/gmail',
    queryStringParameters:{code:'test-code',state:'test-state',destination:'https://evil.test'}}, 'production', (async (url: any, input: any) => {
    calls++;
    const target = new URL(url);
    assert.equal(target.origin,'https://andrade-energy-api-vda.onrender.com');
    assert.equal(target.searchParams.get('code'),'test-code');
    assert.equal(input.redirect,'manual');
    assert.equal(input.headers,undefined);
    return new Response(null,{status:302,headers:{location:'andradegerador://oauth?status=ok'}});
  }) as typeof fetch);
  assert.equal(calls,1); assert.equal(result.statusCode,302);
  assert.equal(result.headers.Location,'andradegerador://oauth?status=ok');
  assert.equal(result.headers['Cache-Control'],'no-store');
  assert.equal(isOAuthIngress('GET','/api/oauth/email/callback/outlook'),true);
  assert.equal(isOAuthIngress('POST','/api/oauth/email/callback/gmail'),false);
  assert.equal(isOAuthIngress('GET','/api/oauth/email/callback/evil'),false);
});
