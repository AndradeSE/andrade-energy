import test, { mock } from "node:test";
import assert from "node:assert/strict";
process.env.SUPABASE_URL = "https://test.invalid";
process.env.SUPABASE_SERVICE_KEY = "test-placeholder";

test("painel do colaborador fornece monitoramento sem carteira, cobranças ou valores de assinatura", async () => {
  const { supabase } = await import("../../config/supabase.js");
  const { obterPainelComercial } = await import("../comercial/comercial.service.js");
  const selections: Array<[string, string]> = [];
  mock.method(supabase, "from", ((table: string) => {
    const rows = ({ usuarios: [{ id: "titular", perfil: "GESTOR" }, { id: "colaborador", perfil: "GESTOR" }], empresa_usuarios: [{ usuario_id: "titular" }], assinaturas_geradores: [{ id: "a", gerador_id: "titular", status: "ATIVA", plano: { nome: "Plano" } }], documentos_comerciais: [] } as Record<string, any[]>)[table] ?? [];
    const q: any = { select: (cols: string) => { selections.push([table, cols]); return q; }, eq: () => q, in: () => q, order: () => q, then: (resolve: any) => Promise.resolve({ data: rows, error: null }).then(resolve) };
    return q;
  }) as any);
  try {
    const result = await obterPainelComercial({ empresa_id: "00000000-0000-4000-8000-000000000001", papel_empresa: "COLABORADOR_COMERCIAL", permissoes: { geradores: true, monitoramento: true, documentos: false } });
    assert.equal(result.financeiro, null);
    assert.deepEqual(result.cobrancas, []);
    assert.deepEqual(result.planos, []);
    assert.deepEqual(result.geradores.map(item => item.id), ["titular"]);
    assert.equal(result.assinaturas.length, 1);
    const cols = selections.find(([table]) => table === "assinaturas_geradores")?.[1] ?? "";
    assert.ok(cols.includes("status"));
    assert.ok(!/\*|valor|asaas|pix|observacoes/.test(cols));
    assert.ok(!selections.some(([table]) => table === "documentos_comerciais"));
  } finally { mock.restoreAll(); }
});
