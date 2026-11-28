import test from "node:test";
import assert from "node:assert/strict";
import { identificarTipoGdDocumento, rotuloTipoGdDocumento } from "./tipoGdDocumento";
import { calcularFaturaComMetaReal } from "../billing/billing.engine";

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

test("meta GD II de 20% acompanha contrato, fatura e memória de cálculo", async () => {
  process.env.SUPABASE_URL ||= "https://test.invalid";
  process.env.SUPABASE_SERVICE_KEY ||= "test-placeholder";
  const { gerarPdfFatura, gerarPdfRelatorioCalculo } = await import("./documentosFatura.service.js");
  const { preencherModeloContrato } = await import("../contratos/modeloContrato.js");
  const { extrairTextoDoBuffer } = await import("../../services/ocr/ocr.service.js");
  const calculo = calcularFaturaComMetaReal({
    modalidade: "COMPENSACAO", energiaCompensada: 300, energiaInjetada: 0, tarifaCheia: 1,
    descontoPercentual: 100, valorCemig: 60, valorEnergiaConcessionaria: 60,
  }, 20);
  const unidade = { tipo_gd: "GD2", desconto_percentual: 40, meta_desconto_real_percentual: 20 };
  const contrato = preencherModeloContrato(unidade, {});
  const clausulas = contrato.clausulas.map(c => c.text).join("\n");
  assert.match(clausulas, /desconto real aproximado de 20(?:,00)?%/i);
  assert.doesNotMatch(clausulas, /com desconto de 40(?:,00)?%/i);
  const fatura = {
    referencia: "2026-11", modalidade_faturamento: "COMPENSACAO", energia_compensada_gd2: 300,
    energia_compensada: 300, base_calculo_kwh: 300, tarifa_cheia: 1, tarifa_andrade: calculo.tarifaAndrade,
    valor_andrade: calculo.valorUsina, valor_usina: calculo.valorUsina, valor_cemig: 60,
    valor_total_unificado: calculo.valorTotalUnificado, economia_real: calculo.economiaReal,
    desconto_contratado_percentual: calculo.descontoContratadoPercentual,
    desconto_real_percentual: calculo.descontoRealPercentual, meta_desconto_real_percentual: 20,
    unidades_consumidoras: unidade,
  };
  const pdf = await extrairTextoDoBuffer(await gerarPdfFatura(fatura, "UNIFICADA"));
  assert.match(pdf, /Desconto real contratado:\s*20(?:,00)?%/);
  assert.match(pdf, /Desconto aplicado na tarifa:\s*40(?:,00)?%/);
  const legado = await extrairTextoDoBuffer(await gerarPdfFatura({
    ...fatura, meta_desconto_real_percentual: null, valor_total_absorvido: 15, valor_absorvido_fio_b: 15,
  }, "UNIFICADA"));
  assert.match(legado, /Desconto real do mês:\s*20(?:,00)?%/);
  assert.match(legado, /Desconto aplicado na tarifa:\s*40(?:,00)?%/);
  assert.doesNotMatch(legado, /absorvid|devolução.*fio b/i);
  const memoria = await extrairTextoDoBuffer(await gerarPdfRelatorioCalculo(fatura));
  assert.match(memoria, /Meta\s*20(?:,00)?%.*Aplicado\s*40(?:,00)?%.*Real\s*20(?:,00)?%/);
});

test("PDF real de injeção exibe GD II e preserva os valores registrados", async () => {
  process.env.SUPABASE_URL ||= "https://test.invalid";
  process.env.SUPABASE_SERVICE_KEY ||= "test-placeholder";
  const { gerarPdfRelatorioCalculo } = await import("./documentosFatura.service.js");
  const { extrairTextoDoBuffer } = await import("../../services/ocr/ocr.service.js");
  const fatura = { referencia: "2026-10", modalidade_faturamento: "INJECAO", base_calculo_kwh: 200, tarifa_cheia: 1, tarifa_andrade: 0.6, valor_andrade: 120, valor_usina: 120, valor_cemig: 30, valor_cemig_repassado: 30, valor_total: 150, clientes: { nome: "TESTE TECNICO - SEM COBRANCA" }, unidades_consumidoras: { id: "fixture", tipo_gd: "GD2" } };
  const original = JSON.stringify(fatura);
  const texto = await extrairTextoDoBuffer(await gerarPdfRelatorioCalculo(fatura));
  assert.match(texto, /GD II\s*·\s*Injeção/);
  assert.match(texto, /150,00/);
  assert.match(texto, /120,00/);
  assert.equal(JSON.stringify(fatura), original);
});
