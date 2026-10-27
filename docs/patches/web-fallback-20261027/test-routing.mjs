import test from 'node:test';import assert from 'node:assert/strict';import {createWebContingencyResolver} from './contingency-routing.mjs';
const primary='https://andrade-energy-api-homologacao.onrender.com';
test('selects only the confirmed reserve without credentials in metadata',async()=>{
 const r=createWebContingencyResolver(async(url,options)=>{assert.equal(options.method,'GET');assert.deepEqual(options.headers,{Accept:'application/json'});assert.equal(options.redirect,'error');return Response.json({environment:'preview',executor:'RENDER_RESERVA',revision:21,contingency:{readyForFailover:true}});});
 assert.equal(await r(primary),'https://andrade-energy-api-reserva-preview.onrender.com');
});
test('rejects arbitrary origins and cross-environment metadata',async()=>{
 const r=createWebContingencyResolver(async()=>Response.json({environment:'production',executor:'RENDER_RESERVA',revision:3,contingency:{readyForFailover:true}}));
 await assert.rejects(r('https://attacker.invalid'));assert.equal(await r(primary),primary);
});
test('outage keeps confirmed owner; timeout never reroutes a business operation',async()=>{
 let clock=0,fail=false,calls=0;const r=createWebContingencyResolver(async()=>{calls++;if(fail)throw Error('offline');return Response.json({environment:'preview',executor:'RENDER_RESERVA',revision:21,contingency:{readyForFailover:true}});},()=>clock);
 await Promise.all([r(primary),r(primary)]);assert.equal(calls,2);clock=61000;fail=true;
 assert.equal(await r(primary),'https://andrade-energy-api-reserva-preview.onrender.com');
});
test('unapproved reserve metadata cannot select a destination',async()=>{
 const r=createWebContingencyResolver(async()=>Response.json({environment:'preview',executor:'RENDER_RESERVA',revision:21,contingency:{readyForFailover:false}}));assert.equal(await r(primary),primary);
});
