import { test } from "node:test";
import assert from "node:assert/strict";
import { averageConsumptionReply, inheritAssistantUnitTarget, selectAssistantClients, selectAssistantUnits } from "./assistant-unit-query";
import { detectCapability } from "./assistant-capabilities";
import { resolveSafeNavigation } from "./assistant-safe-navigation";

const units = [
  { id: "a", numero: "854652001898", cliente_id: "c1", consumo_medio_kwh: "420.5", clientes: { nome: "Guilherme Silva" } },
  { id: "b", numero: "720670501839", cliente_id: "c1", consumo_medio_kwh: 230, clientes: { nome: "Guilherme Silva" } },
  { id: "c", numero: "607081301889", cliente_id: "c2", consumo_medio_kwh: null, clientes: { nome: "Amanda Santos" } },
];

test("consumo médio consulta configuração sem desviar para economia ou navegação", () => {
  for (const q of ["qual o consumo médio do cliente Guilherme?", "mostre o consumo médio da UC 854652001898", "pesquise a média mensal de consumo de Guilherme"]) {
    assert.deepEqual(detectCapability(q), { module: "unidades", mode: "query", review: false });
    assert.equal(resolveSafeNavigation(q, { generator: true, role: "ADMIN", plantId: "p" }), undefined);
  }
});
test("busca somente UCs autorizadas por nome, final, número formatado e contexto", () => {
  assert.deepEqual(selectAssistantUnits(units, "consumo médio do cliente Guilherme?").map(u => u.id), ["a", "b"]);
  assert.deepEqual(selectAssistantUnits(units, "média de consumo da UC 8.546.520.018-98").map(u => u.id), ["a"]);
  assert.deepEqual(selectAssistantUnits(units, "consumo médio da UC final 1839").map(u => u.id), ["b"]);
  assert.deepEqual(selectAssistantUnits(units, "consumo médio da UC 999999", { unitId: "a" }), []);
  assert.deepEqual(selectAssistantUnits(units, "consumo médio do cliente inexistente", { clientId: "c1" }), []);
  assert.deepEqual(selectAssistantUnits(units, "consumo médio", { unitId: "c" }).map(u => u.id), ["c"]);
});
test("resposta distingue média cadastrada, ausente e homônimos", () => {
  assert.match(averageConsumptionReply(units.slice(0, 2)), /420,5 kWh/);
  assert.match(averageConsumptionReply(units.slice(0, 2)), /230 kWh/);
  assert.match(averageConsumptionReply([units[2]]), /não informado/);
  assert.doesNotMatch(averageConsumptionReply([units[2]]), /0 kWh/);
  assert.match(averageConsumptionReply(units), /mais de um cliente/);
});
test("pedido de abrir fatura Cemig não é interceptado pela lista de faturas", () => {
  assert.equal(resolveSafeNavigation("abra a fatura da Cemig da UC 854652001898", { generator: true, role: "ADMIN", plantId: "p" }), undefined);
  assert.equal(detectCapability("abra a fatura da Cemig da UC 854652001898")?.mode, "document");
  assert.equal(resolveSafeNavigation("abra faturas", { generator: true, role: "ADMIN", plantId: "p" })?.action?.route, "/(tabs)/faturas");
});
test("pergunta de acompanhamento preserva cliente ou UC, sem trocar alvo explícito", () => {
  assert.equal(inheritAssistantUnitTarget("e o consumo médio?", "qual foi o consumo da UC 854652001898?"), "e o consumo médio da UC 854652001898");
  assert.equal(inheritAssistantUnitTarget("e o consumo médio?", "qual o telefone do cliente Guilherme?"), "e o consumo médio do cliente guilherme");
  assert.equal(inheritAssistantUnitTarget("consumo médio do cliente Amanda", "qual o telefone do cliente Guilherme?"), "consumo médio do cliente Amanda");
  assert.equal(inheritAssistantUnitTarget("abra clientes", "qual o telefone do cliente Guilherme?"), "abra clientes");
});
test("nome completo tem prioridade sobre clientes que compartilham primeiro nome", () => {
  const clients = [{ nome: "Vinícius Duarte Andrade" }, { nome: "Vinícius Teste" }, { nome: "Vinícius Duarte Andrade Junior" }];
  assert.deepEqual(selectAssistantClients(clients, "qual foi o último consumo do cliente Vinícius Duarte Andrade?"), [clients[0]]);
  assert.equal(selectAssistantClients(clients, "consumo do cliente Vinícius").length, 3);
  assert.deepEqual(selectAssistantClients(clients, "consumo do cliente desconhecido"), []);
  assert.deepEqual(selectAssistantClients(clients, "Localize o cliente Vinícius Duarte Andrade, consulte o consumo e abra a fatura"), [clients[0]]);
  assert.deepEqual(selectAssistantClients(clients, "consumo do cliente Vinícius Duarte Andrade no mes anterior"), [clients[0]]);
});
test("retoma a UC depois de abrir a fatura", () => assert.equal(inheritAssistantUnitTarget("Qual foi o consumo dessa UC?", "Abra a fatura da Cemig da UC final 1898"), "Qual foi o consumo da UC 1898"));
