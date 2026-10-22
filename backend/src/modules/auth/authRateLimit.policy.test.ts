import assert from "node:assert/strict";
import test from "node:test";
import {consultaSessaoAutenticada} from "./authRateLimit.policy";
test("somente leitura de sessão/perfil recebe orçamento próprio; senha e escritas mantêm limite estrito",()=>{
  for(const path of ["/session","/session/","/me"])assert.equal(consultaSessaoAutenticada({method:"GET",path}),true);
  for(const method of ["POST","PUT","DELETE"])for(const path of ["/session","/me","/login","/redefinir-senha"])assert.equal(consultaSessaoAutenticada({method,path}),false);
  assert.equal(consultaSessaoAutenticada({method:"GET",path:"/login"}),false);
});
