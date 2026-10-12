import assert from "node:assert/strict";
import { test } from "node:test";
import { accountIntent, answerAccountQuestion } from "../src/assistantAccountWeb.ts";
import { consumerEnergySummary } from "../src/consumerEnergySummary.ts";
test("Solar consulta apenas a UC selecionada, sem mutação", async () => {
  const paths: string[] = [];
  const result = await answerAccountQuestion("Minhas faturas", { variant: "CONSUMIDOR", unit: { numero: "123", id: "owned" } }, async path => { paths.push(path); return [{ uc: "123", referencia: "OUT/2026", status: "ABERTA", valor_total: 100 }]; });
  assert.deepEqual(paths, ["/faturas?uc=123"]); assert.match(result!.text, /123/);
});
test("operações exigem revisão e não consultam nem alteram dados", async () => {
  const result = await answerAccountQuestion("Emita a fatura", { variant: "GERADOR" }, async () => { throw Error("Não deve chamar"); });
  assert.match(result!.text, /Nenhuma alteração/);
  assert.equal(accountIntent("emitir fatura"), "review");
  const review = await answerAccountQuestion("transferir dinheiro", { variant: "GERADOR" }, async () => { throw Error("Não deve chamar"); });
  assert.match(review!.text, /Nenhuma alteração/);
});
test("consumidor não consulta carteira ou clientes de outros acessos", async () => {
  const result = await answerAccountQuestion("meus clientes", { variant: "CONSUMIDOR" }, async () => { throw Error("Não deve consultar"); });
  assert.match(result!.text, /limitado às suas UCs/);
});
test("ajuda geral não é confundida com consulta de conta", () => {
  assert.equal(accountIntent("Como funciona o faturamento automático?"), null);
  assert.equal(accountIntent("Minha conexão Hotmail"), "email");
});
test("percentual usa energia compensada da competência, nunca o saldo acumulado", () => {
  assert.equal(consumerEnergySummary({ consumo: 300, creditos: 900, ultimaFatura: { energiaCompensada: 150, energiaInjetada: 500 } }).percentage, 50);
  assert.equal(consumerEnergySummary({ consumo: 300, ultimaFatura: { energiaCompensada: 300 } }).percentage, 100);
  assert.equal(consumerEnergySummary({ consumo: 0, creditos: 900 }).percentage, 0);
  assert.equal(consumerEnergySummary({ consumo: NaN, ultimaFatura: { energiaCompensada: Infinity } }).percentage, 0);
});
