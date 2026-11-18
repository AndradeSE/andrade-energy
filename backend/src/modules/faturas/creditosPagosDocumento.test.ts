import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
test('demonstrativo real mostra crédito pago utilizado e saldo restante, sem mudar os valores', async () => {
  process.env.SUPABASE_URL ||= 'https://test.invalid';
  process.env.SUPABASE_SERVICE_KEY ||= 'test-placeholder';
  const { gerarPdfRelatorioCalculo } = await import('./documentosFatura.service.js');
  const { extrairTextoDoBuffer } = await import('../../services/ocr/ocr.service.js');
  const fatura = { referencia:'MAR/2026',numero_instalacao:'99999101127',modalidade_faturamento:'COMPENSACAO',
    energia_compensada:400,base_calculo_kwh:100,tarifa_cheia:1,tarifa_andrade:0.6,valor_andrade:60,valor_usina:60,
    valor_cemig:50,valor_cemig_repassado:50,valor_total:110,saldo_atual:0,
    clientes:{nome:'TESTE FICTÍCIO — SEM COBRANÇA'},unidades_consumidoras:{tipo_gd:'GD1'},
    dados_extraidos:{creditos_pre_pagos:{saldo_anterior_kwh:300,utilizado_kwh:300,saldo_restante_kwh:0,energia_cobravel_kwh:100}} };
  const antes = JSON.stringify(fatura);
  const buffer = await gerarPdfRelatorioCalculo(fatura);
  const texto = await extrairTextoDoBuffer(buffer);
  assert.match(texto,/Créditos de energia já pagos/);
  assert.match(texto,/Utilizado sem nova cobrança:\s*300/);
  assert.match(texto,/Energia que compõe a nova cobrança:\s*100/);
  assert.match(texto,/110,00/);
  assert.equal(JSON.stringify(fatura),antes);
  if (process.env.CREDITOS_PDF_TEST_PATH) await writeFile(process.env.CREDITOS_PDF_TEST_PATH,buffer);
});
