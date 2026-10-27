import test from 'node:test';import assert from 'node:assert/strict';import {proxyApi} from './api-proxy.mjs';import {createWebContingencyResolver} from './contingency-routing.mjs';
test('POST follows confirmed reserve exactly once; token stays out of control requests',async()=>{
 const token='a'.repeat(64);let business=0;
 const resolve=createWebContingencyResolver(async(_url,options)=>{assert.equal(options.headers.Authorization,undefined);return Response.json({environment:'preview',executor:'RENDER_RESERVA',revision:21,contingency:{readyForFailover:true}});});
 const r=await proxyApi(new Request('https://portal.example/api/example',{method:'POST',headers:{Origin:'https://portal.example',Cookie:`__Secure-andrade_web_session=${token}`},body:'{}'}),{ANDRADE_API_ORIGIN:'https://andrade-energy-api-homologacao.onrender.com'},async(url,options)=>{business++;assert.equal(url.origin,'https://andrade-energy-api-reserva-preview.onrender.com');assert.equal(options.headers.get('Authorization'),`Bearer ${token}`);return Response.json({message:'failed'},{status:503});},resolve);
 assert.equal(r.status,503);assert.equal(business,1);
});
