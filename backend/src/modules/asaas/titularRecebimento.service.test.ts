import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = "https://recebimentos-test.invalid";
process.env.SUPABASE_SERVICE_KEY = "test-key";
process.env.ASAAS_API_KEY = "test-key";
process.env.ASAAS_API_URL = "https://asaas-test.invalid/v3";

test("validação de recebimento só consulta, bloqueia terceiros e não aceita carteira de outra usina", async () => {
  const { exigirRecebimentoDaUsina } = await import("./titularRecebimento.service.js");
  const original = globalThis.fetch;
  const chamadas: string[] = [];
  let documentoConta = "12345678901";
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    assert.equal(init?.method ?? "GET", "GET", "a validação não pode criar cobranças ou transferências");
    chamadas.push(url);
    if (url.startsWith("https://recebimentos-test.invalid/rest/v1/usuarios?")) {
      return new Response(JSON.stringify({cpf:"12345678901",empresa_id:"empresa",ativo:true}), {status:200,headers:{"content-type":"application/json"}});
    }
    if (url === "https://asaas-test.invalid/v3/myAccount/commercialInfo/") {
      return new Response(JSON.stringify({cpfCnpj:documentoConta}), {status:200,headers:{"content-type":"application/json"}});
    }
    throw new Error("Requisição inesperada no teste");
  };
  try {
    const carteira = {usuario_id:"titular",empresa_id:"empresa",usina_id:"usina",status:"ATIVA"};
    await exigirRecebimentoDaUsina(carteira,"usina");
    assert.equal(chamadas.length,2);
    documentoConta = "98765432100";
    await assert.rejects(exigirRecebimentoDaUsina(carteira,"usina"), /Cobrança bloqueada/);
    const consultas = chamadas.length;
    await assert.rejects(exigirRecebimentoDaUsina(carteira,"outra"), /vincule a conta/);
    await assert.rejects(exigirRecebimentoDaUsina({...carteira,asaas_wallet_id:"destino-nao-validado"},"usina"), /validação individual/);
    await assert.rejects(exigirRecebimentoDaUsina(null,"usina"), /vincule a conta/);
    assert.equal(chamadas.length,consultas);
  } finally { globalThis.fetch = original; }
});
