import test from "node:test";
import assert from "node:assert/strict";
import { diasParaVencimento } from "./vencimentoContrato.policy";
const contrato = { unidade_consumidora_id: "uc", status: "VIGENTE", aceite_cliente_em: "2026-01-01", vigencia_fim: "2026-11-10" };
test("aviso entra aos 30 dias e recupera dias perdidos sem antecipar", () => {
  assert.equal(diasParaVencimento(contrato, "2026-10-10"), null);
  assert.equal(diasParaVencimento(contrato, "2026-10-11"), 30);
  assert.equal(diasParaVencimento(contrato, "2026-10-12"), 29);
  assert.equal(diasParaVencimento(contrato, "2026-11-10"), 0);
  assert.equal(diasParaVencimento(contrato, "2026-11-11"), null);
});
test("não avisa contrato cancelado, sem assinatura ou sem fidelidade", () => {
  for (const alteracao of [{ status: "CANCELADO" }, { aceite_cliente_em: null }, { vigencia_fim: null }, { configuracao_uc_snapshot: { plano_contrato: "SEM_FIDELIDADE" } }])
    assert.equal(diasParaVencimento({ ...contrato, ...alteracao }, "2026-10-11"), null);
});
