import assert from "node:assert/strict";
import test from "node:test";
import { excedenteDoPeriodo, prepararHistoricoFatura } from "./historicoFatura.policy";

test("excedente usa apenas injeção menos compensação; déficit não vira excedente", () => {
  assert.equal(excedenteDoPeriodo(420, 350), 70);
  assert.equal(excedenteDoPeriodo(300, 350), 0);
  assert.equal(excedenteDoPeriodo(0, 0), 0);
  assert.equal(excedenteDoPeriodo(null, 350), null);
  assert.equal(excedenteDoPeriodo("inválido", 350), null);
});

const atual = { id: "atual", empresa_id: "empresa-teste", unidade_consumidora_id: "uc-teste", numero_instalacao: "123", referencia: "OUT/2026", energia_injetada: 420, energia_compensada: 350, saldo_atual: 820, valor_total_unificado: 340, economia_real: 105 };
const registro = (referencia: string, extra: any = {}) => ({ ...atual, id: referencia, referencia, status: "PAGA", ...extra });

test("histórico separa UCs e empresas, ignora rascunhos e usa dados atuais sem duplicar competência", () => {
  const dados = prepararHistoricoFatura(atual, [
    registro("OUT/2026", { energia_injetada: 9999 }),
    registro("SET/2026", { unidade_consumidora_id: "outra-uc" }),
    registro("AGO/2026", { empresa_id: "outra-empresa" }),
    registro("JUL/2026", { status: "RASCUNHO" }),
    registro("2026-09", { energia_injetada: 310, energia_compensada: 300 }),
    registro("ENCERRAMENTO-2026/10"), registro("NOV/2026"),
  ]);
  assert.deepEqual(dados.map(d => [d.mes, d.excedente]), [["SET/26", 10], ["OUT/26", 70]]);
  assert.equal(dados[1].sem, 445);
  assert.equal(dados[1].com, 340);
});

test("histórico é cronológico, limitado a quatro períodos e sem saldo anterior", () => {
  const dados = prepararHistoricoFatura(atual, [registro("SET/2026"), registro("07/2026"), registro("AGO/2026"), registro("JUN/2026"), registro("MAI/2026")]);
  assert.deepEqual(dados.map(d => d.mes), ["JUL/26", "AGO/26", "SET/26", "OUT/26"]);
  assert.ok(dados.every(d => d.excedente === 70));
});

test("pagamento separado inclui a concessionária no comparativo, sem inventar dados ausentes", () => {
  const dados = prepararHistoricoFatura({ ...atual, fatura_somente_andrade: true, valor_usina: 245, valor_cemig: 95 });
  assert.deepEqual([dados[0].com, dados[0].sem], [340, 445]);
  const incompleta = prepararHistoricoFatura({ ...atual, energia_injetada: null, economia_real: null });
  assert.equal(incompleta[0].excedente, null);
  assert.equal(incompleta[0].sem, null);
});

test("cadastro antigo consulta somente o mesmo número de instalação", () => {
  const legado = { ...atual, unidade_consumidora_id: null };
  const dados = prepararHistoricoFatura(legado, [registro("SET/2026", { unidade_consumidora_id: null, numero_instalacao: "outra" })]);
  assert.equal(dados.length, 1);
});
