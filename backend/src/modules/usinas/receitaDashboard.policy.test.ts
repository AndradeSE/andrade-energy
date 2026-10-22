import assert from "node:assert/strict";
import test from "node:test";
import { receitaAtualDaCompetencia } from "./receitaDashboard.policy";

test("baixa recebida depois do fechamento atualiza a Home, preservando a competência", () => {
  const faturas = [
    { referencia: "SET/2026", status: "PAGO", valor_total: 100, valor_total_unificado: 150 },
    { referencia: "09/2026", status: "ABERTA", valor_total: 40 },
    { referencia: "OUT/2026", status: "PAGO", valor_total: 900 },
  ];
  assert.deepEqual(receitaAtualDaCompetencia(faturas, "2026-09", { receita_prevista: 999, receita_realizada: 0 }), { receitaPrevista: 190, receitaRealizada: 150 });
  faturas[0].status = "ABERTA";
  assert.equal(receitaAtualDaCompetencia(faturas, "2026-09", { receita_realizada: 150 }).receitaRealizada, 0);
});

test("baixa manual e ausência de faturas mantêm a base apropriada", () => {
  assert.equal(receitaAtualDaCompetencia([{ referencia: "SET/2026", valor_total: 25, cobrancas: [{ pago_em: "2026-10-22" }] }], "2026-09").receitaRealizada, 25);
  assert.deepEqual(receitaAtualDaCompetencia([], "2026-09", { receita_prevista: 40, receita_realizada: 10 }), { receitaPrevista: 40, receitaRealizada: 10 });
});
