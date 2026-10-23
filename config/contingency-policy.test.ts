import assert from "node:assert/strict";
import {test} from "node:test";
import {CONTINGENCY_ENDPOINTS,createContingencyResolver,resolveContingencyTarget} from "./contingency-policy";
test("server never selects an arbitrary host or crosses environments",()=>{
  const valid={environment:"preview",revision:1,executor:"NETLIFY",contingency:{readyForFailover:true}};
  assert.equal(resolveContingencyTarget("preview",valid),CONTINGENCY_ENDPOINTS.preview.standby);
  assert.throws(()=>resolveContingencyTarget("production",valid));
  assert.throws(()=>resolveContingencyTarget("preview",{...valid,contingency:{readyForFailover:false}}));
  assert.throws(()=>resolveContingencyTarget("preview",{...valid,executor:"https://evil.test"}));
});
test("parallel calls share one control lookup and outages do not trigger a switch",async()=>{
  let calls=0;let clock=0;let fail=false;
  const resolver=createContingencyResolver("preview",async()=>{
    calls++;if(fail)throw new Error("offline");
    return {environment:"preview",revision:1,executor:"NETLIFY",contingency:{readyForFailover:true}};
  },()=>clock);
  assert.deepEqual(await Promise.all([resolver(),resolver()]),[CONTINGENCY_ENDPOINTS.preview.standby,CONTINGENCY_ENDPOINTS.preview.standby]);
  assert.equal(calls,1);clock=61_000;fail=true;
  assert.equal(await resolver(),CONTINGENCY_ENDPOINTS.preview.standby);
  assert.equal(calls,2);
});
