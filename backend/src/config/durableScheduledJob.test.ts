import assert from "node:assert/strict";
import { test } from "node:test";
import { runScheduledJob } from "./durableScheduledJob";

test("another owner or unavailable database never runs business effects", async () => {
  let called = 0;
  for (const response of [{data:false,error:null},{data:true,error:new Error("offline")}]) {
    const run=runScheduledJob({rpc:async()=>response},"FATURAS_EMAIL","NETLIFY",60,async()=>{called++;});
    if(response.error) await assert.rejects(run); else assert.deepEqual(await run,{executed:false});
  }
  assert.equal(called,0);
});
test("failure is persisted as uncertain and is never replayed in the request", async () => {
  const calls: Array<{name:string,args:Record<string,unknown>}> = [];
  let effects=0;
  const store={rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return {data:true,error:null};}};
  await assert.rejects(runScheduledJob(store,"FATURAS_EMAIL","NETLIFY",60,async()=>{effects++;throw new Error("interrupted");}),/interrupted/);
  assert.equal(effects,1);
  assert.equal(calls[1].args.p_sucesso,false);
  assert.equal(calls[0].args.p_dono,calls[1].args.p_dono);
});
test("successful work is finalized by the same owner and lost ownership fails closed", async () => {
  for(const owns of [true,false]) {
    let count=0;
    const store={rpc:async()=>({data:++count===1?true:owns,error:null})};
    const run=runScheduledJob(store,"COTAS","RENDER",3600,async()=>{});
    if(owns) assert.deepEqual(await run,{executed:true}); else await assert.rejects(run,/conferência/);
    assert.equal(count,2);
  }
});
