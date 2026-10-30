import assert from "node:assert/strict";
import test from "node:test";
import { podeOperarCarteiraDaUsina } from "./carteiraEscopo.policy";
const carteira={usuario_id:"titular",empresa_id:"empresa",usina_id:"usina",status:"ATIVA"};
const adm={id:"outro-adm",empresa_id:"empresa",perfil:"ADMIN",papel_empresa:"ADMIN_EMPRESA"};
test("ADM da mesma empresa opera carteira da usina, com identidade própria",()=>{
  assert.equal(podeOperarCarteiraDaUsina(adm,carteira,"empresa","usina"),true);
});
test("nega outra empresa, usina diferente, colaborador e gestor alheio",()=>{
  assert.equal(podeOperarCarteiraDaUsina({...adm,empresa_id:"outra"},carteira,"empresa","usina"),false);
  assert.equal(podeOperarCarteiraDaUsina(adm,carteira,"empresa","outra"),false);
  assert.equal(podeOperarCarteiraDaUsina({...adm,papel_empresa:"COLABORADOR_GERADOR"},carteira,"empresa","usina"),false);
  assert.equal(podeOperarCarteiraDaUsina({...adm,perfil:"GESTOR"},carteira,"empresa","usina"),false);
  assert.equal(podeOperarCarteiraDaUsina({...adm,id:"titular",perfil:"GESTOR"},carteira,"empresa","usina"),true);
});
