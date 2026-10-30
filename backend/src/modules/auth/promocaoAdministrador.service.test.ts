import test, { mock } from "node:test";
import assert from "node:assert/strict";
process.env.SUPABASE_URL = "https://test.invalid";
process.env.SUPABASE_SERVICE_KEY = "test-placeholder";

test("promoção usa ator e empresa autenticados e não executa RPC sem confirmação ou permissão", async () => {
  const { supabase } = await import("../../config/supabase.js");
  const { promoverColaboradorAdministrador } = await import("../colaboradores/colaboradores.service.js");
  const empresa = "00000000-0000-4000-8000-000000000001";
  const usuario = { id: "ator", empresa_id: empresa, perfil: "ADMIN", papel_empresa: "ADMIN_EMPRESA" };
  const filtros: any[] = []; const chamadas: any[] = [];
  const q: any = { select: () => q, eq: (chave: string, valor: any) => { filtros.push([chave, valor]); return q; },
    maybeSingle: async () => ({ data: { id: "vinculo", usuario_id: "colaborador", empresa_id: empresa, papel: "COLABORADOR_GERADOR", ativo: true }, error: null }) };
  mock.method(supabase, "from", (() => q) as any);
  mock.method(supabase, "rpc", (async (nome: string, params: any) => { chamadas.push({ nome, params }); return { data: { sucesso: true }, error: null }; }) as any);
  try {
    await assert.rejects(promoverColaboradorAdministrador("vinculo", { escopo: "EMPRESA" }, usuario));
    await assert.rejects(promoverColaboradorAdministrador("vinculo", { escopo: "COMPLETO", confirmacao: "PROMOVER_ADMINISTRADOR" }, { ...usuario, papel_empresa: "COLABORADOR_GERADOR" }));
    assert.equal(chamadas.length, 0);
    await promoverColaboradorAdministrador("vinculo", { escopo: "COMPLETO", confirmacao: "PROMOVER_ADMINISTRADOR", p_ator: "outro", empresa_id: "outra" }, usuario);
    assert.deepEqual(chamadas, [{ nome: "promover_colaborador_administrador", params: { p_ator: "ator", p_empresa: empresa, p_vinculo: "vinculo", p_escopo: "COMPLETO" } }]);
    assert.ok(filtros.some(([chave, valor]) => chave === "empresa_id" && valor === empresa));
  } finally { mock.restoreAll(); }
});
