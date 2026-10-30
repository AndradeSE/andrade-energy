import test from "node:test";
import assert from "node:assert/strict";
import { contratoAceitaSolicitacaoCancelamento, processamentoCancelamentoExpirou } from "./cancelamentoContrato.policy";

test("contrato encerrado não aceita nova solicitação", () => {
  assert.equal(contratoAceitaSolicitacaoCancelamento("CANCELADO"), false);
  assert.equal(contratoAceitaSolicitacaoCancelamento("encerrado"), false);
  assert.equal(contratoAceitaSolicitacaoCancelamento("RASCUNHO"), false);
  assert.equal(contratoAceitaSolicitacaoCancelamento("VENCIDO"), false);
  assert.equal(contratoAceitaSolicitacaoCancelamento("VIGENTE"), true);
  assert.equal(contratoAceitaSolicitacaoCancelamento("ATIVO"), true);
});

test("processamento recente não é retomado em paralelo", () => {
  const agora = new Date("2026-09-22T20:00:00.000Z").getTime();
  assert.equal(processamentoCancelamentoExpirou("2026-09-22T19:59:00.000Z", agora), false);
  assert.equal(processamentoCancelamentoExpirou("2026-09-22T19:54:00.000Z", agora), true);
  assert.equal(processamentoCancelamentoExpirou(null, agora), true);
});
