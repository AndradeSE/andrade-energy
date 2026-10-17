import assert from "node:assert/strict";
import test from "node:test";
import { antecipacaoContratada, vencimentoAndrade } from "./vencimentoFatura.policy";
import { preencherModeloContrato } from "./modeloContrato";

const antigo = { unidade_consumidora_id: "uc-teste", status: "VIGENTE", aceite_cliente_em: "2026-10-01", vigencia_fim: "2036-10-01", dados_documento: {} };
const novo = { ...antigo, configuracao_uc_snapshot: { vencimento_dias_antes_concessionaria: 3 } };
test("revisão pendente não antecipa a cobrança do contrato atual", () => {
  assert.equal(antecipacaoContratada([antigo, { ...novo, status: "RASCUNHO", aceite_cliente_em: null }], "2026-10-17"), 0);
  assert.equal(antecipacaoContratada([{ ...antigo, status: "SUBSTITUIDO" }, novo], "2026-10-17"), 3);
});
test("contratos expirados ou ainda sem aceite não autorizam a nova regra", () => {
  assert.equal(antecipacaoContratada([{ ...novo, aceite_cliente_em: null }, { ...novo, vigencia_fim: "2026-09-30" }], "2026-10-17"), 0);
  assert.throws(() => antecipacaoContratada([antigo, novo], "2026-10-17"), /diferentes/);
});
test("subtração de três dias corridos atravessa mês, ano e fevereiro bissexto", () => {
  assert.equal(vencimentoAndrade("2026-10-20", 3, "2026-10-17"), "2026-10-17");
  assert.equal(vencimentoAndrade("2027-01-02", 3, "2026-12-01"), "2026-12-30");
  assert.equal(vencimentoAndrade("2028-03-02", 3, "2028-02-01"), "2028-02-28");
  assert.equal(vencimentoAndrade("2026-10-20", 0, "2026-10-17"), "2026-10-20");
});
test("dados inválidos e novo vencimento já passado exigem revisão", () => {
  assert.throws(() => vencimentoAndrade("2026-02-30", 3, "2026-01-01"), /inválido/);
  assert.throws(() => vencimentoAndrade("2026-10-19", 3, "2026-10-17"), /já passou/);
  assert.equal(vencimentoAndrade("2026-10-19", 3, "2026-10-17", true), "2026-10-16");
});
test("somente a cláusula de pagamento muda; prazo e rescisão permanecem", () => {
  const unidade = { numero: "uc-teste", distribuidora: "CEMIG", clientes: { nome: "Cliente de teste" }, usinas: { tipo_gd: "GD2" } };
  const antes = preencherModeloContrato(unidade, antigo).clausulas;
  const depois = preencherModeloContrato(unidade, novo).clausulas;
  for (let i = 0; i < antes.length; i++) {
    if (antes[i].title.includes("DO PAGAMENTO")) {
      assert.match(antes[i].text, /mesma data de vencimento/);
      assert.match(depois[i].text, /3 \(três\) dias corridos antes/);
      assert.match(depois[i].text, /não altera cobranças já emitidas/);
    } else assert.equal(depois[i].text, antes[i].text);
  }
});
