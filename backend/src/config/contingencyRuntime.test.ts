import assert from "node:assert/strict";
import {test} from "node:test";
import {contingencyEnvironment,primaryApiOrigin} from "./contingencyRuntime";

test("full standby is bound to its exact database and explicit environment",()=>{
  const production={API_RUNTIME:"serverless",BACKGROUND_JOBS_ENABLED:"false",CONTINGENCY_ENVIRONMENT:"production",NETLIFY_PRODUCTION_ENABLED:"true",SUPABASE_URL:"https://ehnkyrsseisvvtbkwrvu.supabase.co"};
  assert.equal(contingencyEnvironment(production),"production");
  for(const alteration of [{BACKGROUND_JOBS_ENABLED:"true"},{CONTINGENCY_ENVIRONMENT:"preview"},{NETLIFY_PRODUCTION_ENABLED:"false"},
    {SUPABASE_URL:"https://qqhcjieymypowunkixmk.supabase.co"},{SUPABASE_URL:production.SUPABASE_URL+".evil.test"}]) {
    assert.equal(contingencyEnvironment({...production,...alteration}),null);
  }
  assert.equal(contingencyEnvironment({...production,CONTINGENCY_ENVIRONMENT:"preview",NETLIFY_FULL_VALIDATION_ENABLED:"true",SUPABASE_URL:"https://qqhcjieymypowunkixmk.supabase.co"}),"preview");
  assert.equal(primaryApiOrigin("production"),"https://andrade-energy-api-vda.onrender.com");
  assert.equal(primaryApiOrigin("preview"),"https://andrade-energy-api-homologacao.onrender.com");
});
