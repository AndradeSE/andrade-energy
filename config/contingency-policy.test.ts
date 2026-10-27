import assert from "node:assert/strict";
import {test} from "node:test";
import {CONTINGENCY_ENDPOINTS,createContingencyResolver,resolveContingencyTarget,readContingencyControlSource} from "./contingency-policy";
test("server never selects an arbitrary host or crosses environments",()=>{
  const valid={environment:"preview",revision:1,executor:"NETLIFY",contingency:{readyForFailover:true}};
  assert.equal(resolveContingencyTarget("preview",valid),CONTINGENCY_ENDPOINTS.preview.netlify);
  assert.throws(()=>resolveContingencyTarget("production",valid));
  assert.throws(()=>resolveContingencyTarget("preview",{...valid,contingency:{readyForFailover:false}}));
  assert.throws(()=>resolveContingencyTarget("preview",{...valid,executor:"https://evil.test"}));
});

test('control remains reachable through Netlify when the Render reserve is suspended',async()=>{
 const calls:string[]=[];
 const result=await readContingencyControlSource('production',(async(url:any,input:any)=>{
   calls.push(url);assert.equal(input.method??'GET','GET');assert.equal(input.redirect,'error');
   if(url.includes('onrender.com'))throw new Error('unavailable');
   return new Response(JSON.stringify({environment:'production',executor:'NETLIFY',revision:5,contingency:{readyForFailover:true}}));
 }) as typeof fetch);
 assert.equal(result.baseURL,CONTINGENCY_ENDPOINTS.production.netlify);assert.equal(result.body.executor,'NETLIFY');assert.equal(calls.length,2);
 await assert.rejects(readContingencyControlSource('production',(async()=>new Response(JSON.stringify({environment:'preview',executor:'NETLIFY',revision:5,contingency:{readyForFailover:true}}))) as typeof fetch));
});
test("parallel calls share one control lookup and outages do not trigger a switch",async()=>{
  let calls=0;let clock=0;let fail=false;
  const resolver=createContingencyResolver("preview",async()=>{
    calls++;if(fail)throw new Error("offline");
    return {environment:"preview",revision:1,executor:"NETLIFY",contingency:{readyForFailover:true}};
  },()=>clock);
  assert.deepEqual(await Promise.all([resolver(),resolver()]),[CONTINGENCY_ENDPOINTS.preview.netlify,CONTINGENCY_ENDPOINTS.preview.netlify]);
  assert.equal(calls,1);clock=61_000;fail=true;
  assert.equal(await resolver(),CONTINGENCY_ENDPOINTS.preview.netlify);
  assert.equal(calls,2);
});

test("Render reserve requires its own environment and a validated release",()=>{
 const value={environment:"preview",revision:3,executor:"RENDER_RESERVA",contingency:{readyForFailover:true}};
 assert.equal(resolveContingencyTarget("preview",value),CONTINGENCY_ENDPOINTS.preview.standby);
 assert.equal(resolveContingencyTarget("production",{...value,environment:"production"}),CONTINGENCY_ENDPOINTS.production.standby);
 assert.throws(()=>resolveContingencyTarget("production",value));
 assert.throws(()=>resolveContingencyTarget("preview",{...value,environment:"production"}));
 assert.equal(resolveContingencyTarget("production",{...value,environment:"production",executor:"NETLIFY"}),CONTINGENCY_ENDPOINTS.production.netlify);
 assert.throws(()=>resolveContingencyTarget("preview",{...value,contingency:{readyForFailover:false}}));
});

test("explicit inactive-owner response invalidates routing without replaying work",async()=>{
 let owner='RENDER';let reads=0;
 const resolver=createContingencyResolver('preview',async()=>{reads++;return {environment:'preview',revision:reads,executor:owner,contingency:{readyForFailover:true}};},()=>100);
 assert.equal(await resolver(),CONTINGENCY_ENDPOINTS.preview.primary);
 owner='RENDER_RESERVA';
 assert.equal(await resolver(),CONTINGENCY_ENDPOINTS.preview.primary);
 resolver.invalidate();
 assert.equal(await resolver(),CONTINGENCY_ENDPOINTS.preview.standby);
 assert.equal(reads,2);
});
