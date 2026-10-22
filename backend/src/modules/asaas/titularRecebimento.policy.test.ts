import assert from "node:assert/strict";
import test from "node:test";
import { exigirMesmoTitularRecebimento } from "./titularRecebimento.policy";

test("permite somente o documento do próprio titular, normalizando a máscara", () => {
  assert.doesNotThrow(() => exigirMesmoTitularRecebimento("123.456.789-01", "12345678901"));
  assert.doesNotThrow(() => exigirMesmoTitularRecebimento("12.345.678/0001-90", "12345678000190"));
});
test("bloqueia terceiros e documentos ausentes mesmo que ambos estejam vazios", () => {
  for (const [conta, gerador] of [[null, null], ["", ""], ["12345678901", "98765432100"], ["12345678901", undefined], ["12", "12"]]) {
    assert.throws(() => exigirMesmoTitularRecebimento(conta, gerador), /Cobrança bloqueada/);
  }
});
