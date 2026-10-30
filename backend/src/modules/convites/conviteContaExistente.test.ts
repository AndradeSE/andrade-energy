import test, { mock } from "node:test";
import assert from "node:assert/strict";

test("convite não confunde a conta administrativa com a conta de consumidor", async () => {
  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY ??= "test-only-key";
  const { supabase } = await import("../../config/supabase.js");
  const { consultarConvite } = await import("./convites.service.js");
  const filtros: Array<[string, unknown]> = [];
  const originalFrom = supabase.from.bind(supabase);
  mock.method(supabase, "from", ((tabela: string) => {
    const consulta = {
      select: () => consulta,
      eq: (campo: string, valor: unknown) => { filtros.push([campo, valor]); return consulta; },
      ilike: () => consulta,
      limit: () => consulta,
      maybeSingle: async () => tabela === "convites_clientes"
        ? { data: { nome: "Teste", cpf: "12345678901", email: "admin@example.com", status: "PENDENTE", expira_em: "2099-01-01T00:00:00Z", empresa_id: "empresa" }, error: null }
        : { data: filtros.some(([campo, valor]) => campo === "perfil" && valor === "LEITURA") ? null : { id: "admin" }, error: null },
    };
    return consulta;
  }) as unknown as typeof originalFrom);
  try {
    const convite = await consultarConvite("convite-de-teste");
    assert.equal(convite.contaExistente, false);
    assert.deepEqual(filtros.find(([campo]) => campo === "perfil"), ["perfil", "LEITURA"]);
  } finally {
    mock.restoreAll();
  }
});
