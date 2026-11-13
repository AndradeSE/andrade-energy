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

test("último consumo consulta a competência mais recente de cada UC, mesmo com importação fora de ordem", async () => {
  const { resumoUltimoConsumo } = await import("./assistant-invoice-summary");
  assert.equal(detectCapability("pesquisar último consumo do cliente Guilherme")?.module, "conta-luz");
  const texto = resumoUltimoConsumo([
    { id: "1", numero_instalacao: "1234", referencia: "09/2026", created_at: "2026-11-02", consumo_kwh: 400 },
    { id: "2", numero_instalacao: "1234", referencia: "OUT/2026", created_at: "2026-10-30", consumo_kwh: 0 },
    { id: "3", numero_instalacao: "5678", referencia: "2026-10", consumo: 210 },
  ]);
  assert.match(texto, /1234 · OUT\/2026 · 0 kWh/);
  assert.match(texto, /5678 · 2026-10 · 210 kWh/);
  assert.doesNotMatch(texto, /400 kWh/);
});
