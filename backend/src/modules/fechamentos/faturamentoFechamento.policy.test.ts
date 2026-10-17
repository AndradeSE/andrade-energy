import test from "node:test";
import assert from "node:assert/strict";
import { faturamentoDoFechamento } from "./faturamentoFechamento.policy";
const fechamento = { empresa_id: "empresa", usina_id: "usina", competencia: "2026-09-01", receita_prevista: 0 };
const fatura = { id: "fatura", empresa_id: "empresa", usina_id: "usina", referencia: "SET/2026", status: "ABERTA", energia_compensada: 281, energia_injetada: 401, valor_total: 387.44, clientes: { nome: "Cliente" }, numero_instalacao: "UC1" };
test("compensação existe mesmo sem rateio interno e sem pagamento", () => {
  const resultado = faturamentoDoFechamento(fechamento, [fatura]);
  assert.equal(resultado.receita_prevista_faturas, 387.44);
  assert.equal(resultado.receita_recebida_faturas, 0);
  assert.equal(resultado.compensacoes_faturas[0].energia_compensada, 281);
  assert.equal(resultado.compensacoes_faturas[0].economia, null);
});
test("pagamento atualiza o recebido da competência original; não mistura escopos nem canceladas", () => {
  const resultado = faturamentoDoFechamento(fechamento, [
    { ...fatura, cobrancas: [{ pago_em: "2026-10-15" }] },
    { ...fatura, empresa_id: "outra" }, { ...fatura, usina_id: "outra" },
    { ...fatura, referencia: "OUT/2026" }, { ...fatura, status: "CANCELADA" },
    { ...fatura, status: "RASCUNHO" }, { ...fatura, status: "ANEXADA" },
  ]);
  assert.equal(resultado.receita_recebida_faturas, 387.44);
  assert.equal(resultado.receita_pendente_faturas, 0);
  assert.equal(resultado.compensacoes_faturas.length, 1);
});
test("sem dados de compensação não inventa energia nem usa projeção", () => {
  const resultado = faturamentoDoFechamento({ ...fechamento, energia_alocada: 7301 }, [{ ...fatura, energia_compensada: null }]);
  assert.deepEqual(resultado.compensacoes_faturas, []);
});
