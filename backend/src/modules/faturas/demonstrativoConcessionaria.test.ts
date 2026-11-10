import { test } from "node:test";
import assert from "node:assert/strict";
import pdfParse from "pdf-parse";
import { dadosDemonstrativoConcessionaria, chaveDemonstrativoConcessionaria, gerarDemonstrativoConcessionaria } from "./demonstrativoConcessionaria";

test("demonstrativo não incorpora pagamentos nem páginas originais", async () => {
  const fatura = { numero_instalacao: "1131082701880", referencia: "OUT/2026", vencimento: "2026-11-05", consumo_kwh: 214, energia_compensada: 170, valor_cemig: 360.8,
    clientes: { nome: "Cliente de exemplo" }, codigo_pix: "PAYLOAD_SECRETO", linha_digitavel: "12345678901234567890123456789012345678901234567", pdf_cemig_url: "https://original.invalid/boleto.pdf" };
  const parsed = await pdfParse(await gerarDemonstrativoConcessionaria(fatura));
  assert.equal(parsed.numpages, 1);
  assert.match(parsed.text, /Não pague este demonstrativo/);
  assert.match(parsed.text, /1131082701880/);
  assert.match(parsed.text, /360,80/);
  assert.doesNotMatch(parsed.text, /PAYLOAD_SECRETO|12345678901234567890|original.invalid/);
  assert.equal(chaveDemonstrativoConcessionaria(fatura), chaveDemonstrativoConcessionaria({ ...fatura, codigo_pix: "OUTRO" }));
  assert.notEqual(chaveDemonstrativoConcessionaria(fatura), chaveDemonstrativoConcessionaria({ ...fatura, valor_cemig: 361 }));
  assert.equal(dadosDemonstrativoConcessionaria({}).consumo, null);
  assert.equal(dadosDemonstrativoConcessionaria({ consumo: 0 }).consumo, 0);
});
