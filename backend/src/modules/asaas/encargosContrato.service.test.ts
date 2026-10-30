import assert from "node:assert/strict";
import test from "node:test";
import PDFDocument from "pdfkit";
import parsePdf from "pdf-parse";
import { renderizarModeloContrato } from "../contratos/modeloContrato";
import { encargosDoTextoAssinado } from "./encargosContrato.policy";

process.env.SUPABASE_URL = "https://encargos-test.invalid";
process.env.SUPABASE_SERVICE_KEY = "test";
process.env.ASAAS_API_KEY = "test";
process.env.ASAAS_API_URL = "https://asaas-test.invalid/v3";
test("reconhece os encargos no PDF real gerado pelo modelo do aplicativo", async () => {
  const arquivo = await renderizarModeloContrato({ desconto_percentual: 27, clientes: { nome: "Cliente de teste" }, usinas: { nome: "Usina de teste" } }, { dados_documento: {}, desconto: 27 });
  const resultado = await parsePdf(arquivo);
  assert.equal(encargosDoTextoAssinado(resultado.text).interest.value, 1);
});
test("confere o PDF da UC e não presume encargos para URL externa ou contratos ambíguos", async () => {
  const { encargosDoContratoDaUc, configurarEncargosDoBoleto } = await import("./encargosContrato.service.js");
  const pdf = new PDFDocument({ compress: false });
  const bytes: Buffer[] = [];
  const pronto = new Promise<Buffer>(resolve => { pdf.on("data", c => bytes.push(c)); pdf.on("end", () => resolve(Buffer.concat(bytes))); });
  pdf.text("O atraso no pagamento da remuneração acarretará multa moratória de 2% (dois por cento) sobre o valor devido, juros de mora de 1% (um por cento) ao mês, calculados pro rata die");
  pdf.end();
  const arquivo = await pronto;
  const original = globalThis.fetch;
  let caminho = "empresa/contrato.pdf";
  let quantidade = 1;
  let configuracoes = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "asaas-test.invalid") {
      assert.equal(url.pathname, "/v3/payments/pay_teste");
      assert.equal(init?.method, "PUT");
      assert.deepEqual(JSON.parse(String(init?.body)), {interest:{value:1},fine:{value:2,type:"PERCENTAGE"}});
      configuracoes++;
      return new Response(JSON.stringify({id:"pay_teste",status:"OVERDUE",value:100,dueDate:"2026-10-01"}), {headers:{"content-type":"application/json"}});
    }
    assert.equal(init?.method ?? "GET", "GET");
    if (url.pathname === "/rest/v1/contratos") {
      assert.equal(url.searchParams.get("empresa_id"), "eq.empresa");
      assert.equal(url.searchParams.get("unidade_consumidora_id"), "eq.uc");
      return new Response(JSON.stringify(Array.from({length: quantidade}, (_, i) => ({id:String(i),unidade_consumidora_id:"uc",status:"VIGENTE",aceite_cliente_em:"2026-10-01",contrato_assinado_url:caminho}))), { headers: {"content-type":"application/json"} });
    }
    assert.equal(url.pathname, "/storage/v1/object/contratos/empresa/contrato.pdf");
    return new Response(new Uint8Array(arquivo), { headers: {"content-type":"application/pdf"} });
  };
  try {
    assert.deepEqual(await encargosDoContratoDaUc("uc", "empresa"), {interest:{value:1},fine:{value:2,type:"PERCENTAGE"}});
    const atualizado = await configurarEncargosDoBoleto({id:"pay_teste",status:"OVERDUE"},"uc","empresa");
    assert.equal(atualizado.dueDate,"2026-10-01");
    assert.equal(atualizado.value,100);
    assert.equal(configuracoes,1);
    await assert.rejects(configurarEncargosDoBoleto({id:"pay_teste",status:"RECEIVED"},"uc","empresa"), /pendentes ou vencidas/);
    assert.equal(configuracoes,1);
    caminho = "https://externo.invalid/contrato.pdf";
    await assert.rejects(encargosDoContratoDaUc("uc", "empresa"), /disponível/);
    quantidade = 2;
    await assert.rejects(encargosDoContratoDaUc("uc", "empresa"), /único contrato/);
  } finally { globalThis.fetch = original; }
});
