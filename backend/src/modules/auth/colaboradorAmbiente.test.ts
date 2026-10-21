import test from "node:test";
import assert from "node:assert/strict";
process.env.SUPABASE_URL = "https://test.invalid";
process.env.SUPABASE_SERVICE_KEY = "test-placeholder";

test("colaborador comercial não entra na operação geradora pelo perfil GESTOR salvo", async () => {
  const { exigirGestor } = await import("../../middlewares/auth.middleware.js");
  for (const perfil of ["ADMIN", "GESTOR", "LEITURA"]) {
    let status = 0; let continuou = false;
    const res: any = { status: (value: number) => { status = value; return res; }, json: () => res };
    exigirGestor({ usuario: { perfil, papel_empresa: "COLABORADOR_COMERCIAL" }, baseUrl: "/api/usinas", path: "/" } as any, res, () => { continuou = true; });
    assert.equal(status, 403); assert.equal(continuou, false);
  }
});
test("operação geradora mantém o controle de permissões do colaborador", async () => {
  const { exigirGestor } = await import("../../middlewares/auth.middleware.js");
  for (const permitido of [true, false]) {
    let continuou = false;
    const res: any = { status: () => res, json: () => res };
    exigirGestor({ usuario: { perfil: "GESTOR", papel_empresa: "COLABORADOR_GERADOR", permissoes: { faturas: permitido } }, baseUrl: "/api/faturas", path: "/" } as any, res, () => { continuou = true; });
    assert.equal(continuou, permitido);
  }
});
