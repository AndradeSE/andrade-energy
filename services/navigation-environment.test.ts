import test from "node:test";
import assert from "node:assert/strict";
import { environmentForRoute } from "./navigation-environment";
test("telas compartilhadas preservam o ambiente de origem",()=>{
  let ambiente=environmentForRoute("/admin/comercial");
  for(const rota of ["/sobre","/perfil","/configuracoes-assistente","/assistente"]){ambiente=environmentForRoute(rota)??ambiente;assert.equal(ambiente,"comercial");}
  ambiente=environmentForRoute("/selecionar-unidade")??ambiente;
  ambiente=environmentForRoute("/sobre")??ambiente;
  assert.equal(ambiente,"gerador");
  assert.equal(environmentForRoute("/colaboradores","gerador"),"gerador");
  assert.equal(environmentForRoute("/colaboradores","comercial"),"comercial");
});
