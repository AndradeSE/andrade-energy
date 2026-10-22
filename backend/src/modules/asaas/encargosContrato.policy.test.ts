import assert from "node:assert/strict";
import test from "node:test";
import { encargosDoTextoAssinado } from "./encargosContrato.policy";
const texto = "O atraso no pagamento da remuneração acarretará multa moratória de 2% (dois por cento) sobre o valor devido, juros de mora de 1% (um por cento) ao mês, calculados pro rata die";
test("configura as taxas do documento, sem somá-las ao principal", () => {
  assert.deepEqual(encargosDoTextoAssinado(texto.replace(/ /g, "\n")), { interest: { value: 1 }, fine: { value: 2, type: "PERCENTAGE" } });
});
test("não presume taxas para cláusula diferente ou documento sem encargos", () => {
  assert.throws(() => encargosDoTextoAssinado(texto.replace("2%", "10%")), /conferência/);
  assert.throws(() => encargosDoTextoAssinado("Sem multa ou juros"), /conferência/);
});
