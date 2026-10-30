import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSolarRequest, hasSolarMutation, isSolarHelp, solarSuggestions } from "../../shared/solar-language.ts";
import { parseAutomationCommand } from "../../shared/solar-automation.ts";
import { accountIntent } from "../src/assistantAccountWeb.ts";
import { planSolarFlow } from "../src/assistantFlows.ts";
test("pedidos educados têm a mesma intenção sem modificar o valor a salvar", () => {
  assert.equal(normalizeSolarRequest("Solar, por favor, você pode abrir contratos"),"abrir contratos");
  assert.equal(planSolarFlow("Solar, por favor, você pode abrir contratos", "CONSUMIDOR", ["Contratos"])?.section,"Contratos");
  const command=parseAutomationCommand("Solar, por favor, pode alterar meu nome para João Antônio Silva")!;
  assert.equal(command.value,"João Antônio Silva"); assert.equal(command.entity,"profile");
});
test("formas imperativas nunca se confundem com consulta", () => {
  for (const text of ["transfira saldo", "pague fatura", "assine contrato", "altere email", "renomeie UC 123", "ative Gmail", "envie convite"]) {
    assert.equal(hasSolarMutation(text),true,text); assert.equal(accountIntent(text),"review",text);
  }
  assert.equal(isSolarHelp("Solar, por favor, como alterar meu telefone?"),true);
  assert.equal(accountIntent("Como funciona o faturamento?"),null);
});
test("atalhos sugeridos são separados por acesso", () => {
  assert.ok(solarSuggestions(true).includes("Abrir clientes"));
  assert.ok(!solarSuggestions(false).includes("Abrir clientes"));
});
