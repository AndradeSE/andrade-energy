import test, { mock } from "node:test";
import assert from "node:assert/strict";

test("vincular consumidor nunca desativa um acesso administrativo existente", async () => {
  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY ??= "test-only-key";
  const { supabase } = await import("../../config/supabase.js");
  const { vincularUsuarioAoClientePendente } = await import("./auth.repository.js");
  let tentouAtualizar = false;
  const originalFrom = supabase.from.bind(supabase);
  mock.method(supabase, "from", (() => {
    const consulta = {
      select: () => consulta,
      eq: () => consulta,
      maybeSingle: async () => ({ data: { id: "vinculo-admin", papel: "ADMIN_EMPRESA" }, error: null }),
      update: () => { tentouAtualizar = true; return consulta; },
      insert: () => { tentouAtualizar = true; return consulta; },
    };
    return consulta;
  }) as unknown as typeof originalFrom);
  try {
    await assert.rejects(
      vincularUsuarioAoClientePendente("usuario", "cliente", "empresa"),
      /acesso administrativo não pode ser convertido/i,
    );
    assert.equal(tentouAtualizar, false);
  } finally {
    mock.restoreAll();
  }
});

test("recuperação no app Consumidor não seleciona a conta administrativa", async () => {
  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY ??= "test-only-key";
  const { supabase } = await import("../../config/supabase.js");
  const { solicitarRecuperacaoSenha } = await import("./auth.service.js");
  const filtros: Array<[string, unknown]> = [];
  const originalFrom = supabase.from.bind(supabase);
  mock.method(supabase, "from", (() => {
    const consulta = {
      select: () => consulta,
      eq: (campo: string, valor: unknown) => { filtros.push([campo, valor]); return consulta; },
      in: () => consulta,
      limit: async () => ({ data: [], error: null }),
    };
    return consulta;
  }) as unknown as typeof originalFrom);
  try {
    const resposta = await solicitarRecuperacaoSenha("admin@example.com", "CONSUMIDOR");
    assert.equal(resposta.emailEnviado, false);
    assert.deepEqual(filtros.find(([campo]) => campo === "perfil"), ["perfil", "LEITURA"]);
  } finally {
    mock.restoreAll();
  }
});
