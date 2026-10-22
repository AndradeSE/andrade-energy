import test from "node:test";
import assert from "node:assert/strict";
import { permissaoComercial, normalizarPermissoesComerciais } from "./permissoesComerciais";
import { EMPRESA_ANDRADE_ID, usuarioEhSuperAdministradorAndrade } from "../../config/empresa";
const convidado = { empresa_id: EMPRESA_ANDRADE_ID, papel_empresa: "COLABORADOR_COMERCIAL", perfil: "GESTOR", permissoes: {} };
test("novos poderes são opt-in e herdam a consulta obrigatória", () => {
  assert.equal(permissaoComercial(convidado,"ambientes_gerador"),false);
  assert.equal(permissaoComercial(convidado,"geradores_convidar"),false);
  assert.equal(permissaoComercial({...convidado,permissoes:{geradores_convidar:true}},"geradores_convidar"),true);
  assert.equal(permissaoComercial({...convidado,permissoes:{geradores:false,geradores_convidar:true}},"geradores_convidar"),false);
  assert.equal(permissaoComercial({...convidado,permissoes:{cobrancas_consultar:false,cobrancas_lembrar:true}},"cobrancas_lembrar"),false);
  assert.equal(normalizarPermissoesComerciais({ambientes_gerador:"true",admin:true}).ambientes_gerador,false);
});
test("colaborador com perfil legado ADMIN nunca vira superadministrador", () => {
  assert.equal(usuarioEhSuperAdministradorAndrade({...convidado,perfil:"ADMIN"}),false);
  assert.equal(permissaoComercial({...convidado,empresa_id:"outra",permissoes:{ambientes_gerador:true}},"ambientes_gerador"),false);
  assert.equal(permissaoComercial({...convidado,papel_empresa:"COLABORADOR_GERADOR",permissoes:{geradores:true}},"geradores"),false);
});
