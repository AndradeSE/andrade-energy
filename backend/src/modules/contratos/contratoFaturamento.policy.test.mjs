import assert from "node:assert/strict";
import test from "node:test";
import { configuracaoVigenteParaFaturamento } from "./contratoFaturamento.policy.ts";

test("revisão pendente mantém desconto, modalidade e rateio do contrato assinado", () => {
  const proposta = { usina_id: "nova", modalidade_faturamento: "INJECAO", desconto_percentual: 30, percentual_rateio: 70, fatura_somente_andrade: true };
  const contrato = { configuracao_uc_snapshot: { usina_id: "antiga", modalidade_faturamento: "COMPENSACAO", desconto_percentual: 20, percentual_rateio: 10, fatura_somente_andrade: false, repassar_disponibilidade_gd2: false } };
  const vigente = configuracaoVigenteParaFaturamento(proposta, contrato);
  assert.equal(vigente.usina_id, "antiga");
  assert.equal(vigente.modalidade_faturamento, "COMPENSACAO");
  assert.equal(vigente.desconto_percentual, 20);
  assert.equal(vigente.percentual_rateio, 10);
  assert.equal(vigente.fatura_somente_andrade, false);
  assert.equal(vigente.percentual_repasse_disponibilidade, 0);
  assert.equal(proposta.desconto_percentual, 30);
});

test("sem revisão pendente usa a configuração atual da UC", () => {
  const unidade = { desconto_percentual: 30 };
  assert.equal(configuracaoVigenteParaFaturamento(unidade, null), unidade);
});

test("não fatura revisão antiga sem snapshot verificável", () => {
  assert.throws(() => configuracaoVigenteParaFaturamento({ desconto_percentual: 30 }, { id: "antigo" }), /condições do contrato anterior/);
});
