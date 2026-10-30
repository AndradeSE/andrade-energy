import test from "node:test";
import assert from "node:assert/strict";
import { demonstrativoCompensacao } from "./descontoCompensacao.policy";
const fatura = { energia_compensada: 281, tarifa_cheia: 1.17263918, tarifa_andrade: .703584, desconto_contratado_percentual: 40, valor_total_absorvido: 12.52 };
test("benefício depende da compensação e não do excedente ou total cobrado", () => {
  const resultado = demonstrativoCompensacao(fatura, 58.6345106)!;
  assert.equal(resultado.valor_referencia_sem_andrade, 329.51);
  assert.ok(resultado.desconto_real_percentual < 27);
  assert.deepEqual(resultado, demonstrativoCompensacao({ ...fatura, energia_injetada: 90000, saldo_atual: 99999, valor_andrade: 17000 }, 58.6345106));
  assert.deepEqual(Object.keys(resultado).sort(), ['desconto_real_percentual','economia','economia_real','valor_referencia_sem_andrade']);
});
test("sem compensação o benefício é zero e dados inválidos não são inventados", () => {
  assert.equal(demonstrativoCompensacao({ ...fatura, energia_compensada: 0 }, 10)!.desconto_real_percentual, 0);
  assert.equal(demonstrativoCompensacao(fatura, NaN), null);
});
