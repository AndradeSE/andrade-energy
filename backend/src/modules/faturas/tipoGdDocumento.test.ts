import test from "node:test";
import assert from "node:assert/strict";
import { identificarTipoGdDocumento, rotuloTipoGdDocumento } from "./tipoGdDocumento";

test("memória de injeção GD2 não vira GD1 quando não há custos ou diferença de tarifa", () => {
  const fatura = { modalidade_faturamento: "INJECAO", custo_disponibilidade: 0, tarifa_gd: 1, tarifa_cheia: 1, unidades_consumidoras: { tipo_gd: "GD2" } };
  assert.equal(rotuloTipoGdDocumento(identificarTipoGdDocumento(fatura)), "GD II");
});
test("custo de disponibilidade não transforma uma GD1 em GD2", () => {
  assert.equal(identificarTipoGdDocumento({ custo_disponibilidade: 119.96, unidades_consumidoras: { tipo_gd: "GD1" } }), "GD1");
});
test("registro da fatura e leitura original têm precedência sobre configuração atual", () => {
  assert.equal(identificarTipoGdDocumento({ tipo_gd: "GD I", unidades_consumidoras: { tipo_gd: "GD2" } }), "GD1");
  assert.equal(identificarTipoGdDocumento({ tipo_gd_documento: "MISTA", unidades_consumidoras: { tipo_gd: "GD2" } }), "MISTA");
});
test("identificação mista e configuração da usina não dependem do modelo de cobrança", () => {
  assert.equal(identificarTipoGdDocumento({ energia_compensada_gd1: 10, energia_compensada_gd2: 20 }), "MISTA");
  assert.equal(identificarTipoGdDocumento({ unidades_consumidoras: { tipo_gd: "GD1", usinas: { tipo_gd: "GD2" } } }), "GD2");
});
test("sem evidência de enquadramento, documento não afirma GD1", () => {
  assert.equal(rotuloTipoGdDocumento(identificarTipoGdDocumento({ custo_disponibilidade: 100 })), "GD não informado");
});

test("PDF real de injeção exibe GD II e preserva os valores registrados", async () => {
  process.env.SUPABASE_URL ||= "https://test.invalid";
  process.env.SUPABASE_SERVICE_KEY ||= "test-placeholder";
  const { gerarPdfRelatorioCalculo } = await import("./documentosFatura.service");
  const { extrairTextoDoBuffer } = await import("../../services/ocr/ocr.service");
  const fatura = { referencia: "2026-10", modalidade_faturamento: "INJECAO", base_calculo_kwh: 200, tarifa_cheia: 1, tarifa_andrade: 0.6, valor_andrade: 120, valor_usina: 120, valor_cemig: 30, valor_cemig_repassado: 30, valor_total: 150, clientes: { nome: "TESTE TECNICO - SEM COBRANCA" }, unidades_consumidoras: { id: "fixture", tipo_gd: "GD2" } };
  const original = JSON.stringify(fatura);
  const texto = await extrairTextoDoBuffer(await gerarPdfRelatorioCalculo(fatura));
  assert.match(texto, /GD II\s*·\s*Injeção/);
  assert.match(texto, /150,00/);
  assert.match(texto, /120,00/);
  assert.equal(JSON.stringify(fatura), original);
});
