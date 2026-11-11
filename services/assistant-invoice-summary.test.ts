import { test } from "node:test";
import assert from "node:assert/strict";
import { resumoContaConcessionaria } from "./assistant-invoice-summary";
test("Solar informa dados registrados da fatura sem inventar ausentes nem expor pagamento", () => {
  const texto = resumoContaConcessionaria({ numero_instalacao: "1131082701880", clientes: { nome: "Cliente cadastrado" }, titular: "Outro titular", consumo: 214, energia_compensada: 0, valor_cemig: 360.8, codigo_pix: "segredo" });
  assert.match(texto, /Cliente cadastrado/);
  assert.match(texto, /214 kWh/);
  assert.match(texto, /0 kWh/);
  assert.match(texto, /360,80/);
  assert.match(texto, /referência não informada/);
  assert.doesNotMatch(texto, /segredo|Outro titular/);
});

import { detectCapability } from "./assistant-capabilities";
test("dados CEMIG do cliente seguem para fatura e abrir solicita documento", () => {
  assert.equal(detectCapability("me informe os dados da fatura da Cemig do cliente Guilherme")?.module, "conta-luz");
  assert.equal(detectCapability("me informe os dados da fatura da Cemig do cliente Guilherme")?.mode, "query");
  assert.equal(detectCapability("abra a fatura da Cemig do cliente Guilherme")?.mode, "document");
  assert.equal(detectCapability("qual o email do cliente Guilherme")?.module, "clientes");
});
