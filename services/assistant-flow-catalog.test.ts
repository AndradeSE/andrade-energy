import assert from "node:assert/strict";
import { test } from "node:test";
import { ASSISTANT_MODULES, detectCapability } from "./assistant-capabilities";
import { SOLAR_FLOW_CATALOG } from "./assistant-flow-catalog";
import { verifiedAppGuide } from "./assistant-app-guide";

test("cada módulo registrado tem fluxo informado à conversa por voz", () => {
  assert.deepEqual(Object.keys(SOLAR_FLOW_CATALOG).sort(), [...ASSISTANT_MODULES].sort());
  for (const variant of ["gerador", "consumidor"] as const) {
    const guide = verifiedAppGuide(variant);
    for (const module of ASSISTANT_MODULES) assert.ok(guide.includes(SOLAR_FLOW_CATALOG[module]), module);
  }
});
test("pedidos de dados usam consultas em vez de instruções para procurar na tela", () => {
  for (const [question, module] of [
    ["qual o consumo médio do cliente Guilherme", "unidades"],
    ["me diga o consumo do cliente Guilherme", "conta-luz"],
    ["qual o email da UC final 1898", "clientes"],
    ["qual a cota do Supabase", "cotas"],
    ["consulte o histórico de leituras da UC final 1898", "leituras"],
    ["liste as usinas", "usinas"], ["liste clientes", "clientes"],
    ["qual a economia do cliente Guilherme", "economia"],
  ]) {
    assert.equal(detectCapability(question)?.module, module, question);
    assert.equal(detectCapability(question)?.mode, "query", question);
  }
});
