import assert from "node:assert/strict";
import test from "node:test";
process.env.SUPABASE_URL = "https://media-test.invalid";
process.env.SUPABASE_SERVICE_KEY = "test";
test("média real atualiza somente o cadastro da usina correspondente e preserva indicação sem histórico", async () => {
  const { calcularProducaoMedia12Meses } = await import("./usinas.service.js");
  const original = globalThis.fetch;
  let production = [{ energia_gerada: 16000 }, { energia_gerada: 20000 }];
  let registered = 12000, writes = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    let response: any;
    if (url.pathname === "/rest/v1/fechamentos") {
      assert.equal(url.searchParams.get("usina_id"), "eq.usina-teste");
      assert.equal(url.searchParams.get("limit"), "12");
      response = production;
    } else if (url.pathname === "/rest/v1/usinas") {
      assert.equal(url.searchParams.get("id"), "eq.usina-teste");
      if (init?.method === "PATCH") {
        assert.equal(url.searchParams.get("empresa_id"), "eq.empresa-teste");
        assert.deepEqual(JSON.parse(String(init.body)), { geracao_media: 18000 });
        registered = 18000; writes++; response = null;
      } else response = { geracao_media: registered, empresa_id: "empresa-teste" };
    } else throw Error(`Consulta inesperada: ${url.pathname}`);
    return new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    assert.equal(await calcularProducaoMedia12Meses("usina-teste"), 18000);
    assert.equal(writes, 1);
    assert.equal(await calcularProducaoMedia12Meses("usina-teste"), 18000);
    assert.equal(writes, 1);
    production = [];
    assert.equal(await calcularProducaoMedia12Meses("usina-teste"), 18000);
    assert.equal(writes, 1);
  } finally { globalThis.fetch = original; }
});
