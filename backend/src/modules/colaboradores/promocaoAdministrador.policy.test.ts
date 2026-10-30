import test from "node:test";
import assert from "node:assert/strict";
import { opcoesPromocaoAdministrador, validarPromocaoAdministrador } from "./promocaoAdministrador.policy";
import { EMPRESA_ANDRADE_ID } from "../../config/empresa";
const adm = { id: "adm", empresa_id: EMPRESA_ANDRADE_ID, perfil: "ADMIN", papel_empresa: "ADMIN_EMPRESA" };
const alvo = { usuario_id: "alvo", empresa_id: EMPRESA_ANDRADE_ID, papel: "COLABORADOR_GERADOR", ativo: true };
test("Promoção oferece somente acesso ADM completo, limitado à empresa", () => {
  assert.deepEqual(opcoesPromocaoAdministrador(adm), ["COMPLETO"]);
  assert.deepEqual(opcoesPromocaoAdministrador({ ...adm, empresa_id: "parceira", perfil: "GESTOR" }), ["COMPLETO"]);
  for (const escopo of ["COMPLETO"]) assert.doesNotThrow(() => validarPromocaoAdministrador(adm, alvo, escopo));
});
test("nega autopromoção, outra empresa, inativo, consumidor e escopo arbitrário", () => {
  for (const alteracao of [{ usuario_id: "adm" }, { empresa_id: "outra" }, { ativo: false }, { papel: "LEITURA" }, { papel: "ADMIN_EMPRESA" }])
    assert.throws(() => validarPromocaoAdministrador(adm, { ...alvo, ...alteracao }, "COMPLETO"));
  assert.throws(() => validarPromocaoAdministrador(adm, alvo, "SUPERADMIN"));
  for (const papel_empresa of ["COLABORADOR_GERADOR", "COLABORADOR_COMERCIAL", "LEITURA"])
    assert.deepEqual(opcoesPromocaoAdministrador({ ...adm, papel_empresa }), []);
});
