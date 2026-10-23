import assert from "node:assert/strict";
import { mock, test } from "node:test";

test("recuperação não consulta nem altera fator sem conferir a senha", async () => {
  process.env.SUPABASE_URL ??= "https://test.invalid";
  process.env.SUPABASE_SERVICE_KEY ??= "test-placeholder";
  const { supabase } = await import("../../config/supabase.js");
  const { protegerSenha } = await import("../../utils/password.js");
  const { solicitarRecuperacaoAutenticador, confirmarRecuperacaoAutenticador } = await import("./recuperacaoAutenticador.service.js");
  const user = { id: "user", senha: await protegerSenha("senha-unitaria-longa"), email: "teste@example.invalid" };
  let acessos = 0;
  mock.method(supabase, "from", (() => { acessos++; throw new Error("Não pode acessar banco"); }) as any);
  mock.method(supabase, "rpc", (() => { acessos++; throw new Error("Não pode alterar banco"); }) as any);
  try {
    await assert.rejects(solicitarRecuperacaoAutenticador(user, "errada"), /Senha atual incorreta/);
    await assert.rejects(confirmarRecuperacaoAutenticador(user, "errada", "qualquer", "12345678"), /Senha atual incorreta/);
    await assert.rejects(confirmarRecuperacaoAutenticador(user, "senha-unitaria-longa", "id-invalido", "12345678"), /8 dígitos/);
    assert.equal(acessos, 0);
  } finally { mock.restoreAll(); }
});

test("código de recuperação fica vinculado à solicitação e à conta, sem segredo configurado falha fechado", async () => {
  const { hashCodigoRecuperacao } = await import("./recuperacaoAutenticador.service.js");
  const original = process.env.FINANCIAL_DATA_ENCRYPTION_KEY;
  const oauth = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  try {
    process.env.FINANCIAL_DATA_ENCRYPTION_KEY = "somente-teste";
    assert.notEqual(hashCodigoRecuperacao("pedido1", "conta1", "12345678"), hashCodigoRecuperacao("pedido2", "conta1", "12345678"));
    assert.notEqual(hashCodigoRecuperacao("pedido1", "conta1", "12345678"), hashCodigoRecuperacao("pedido1", "conta2", "12345678"));
    delete process.env.FINANCIAL_DATA_ENCRYPTION_KEY; delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
    assert.throws(() => hashCodigoRecuperacao("pedido1", "conta1", "12345678"), /indisponível/);
  } finally {
    if (original === undefined) delete process.env.FINANCIAL_DATA_ENCRYPTION_KEY; else process.env.FINANCIAL_DATA_ENCRYPTION_KEY = original;
    if (oauth === undefined) delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY; else process.env.OAUTH_TOKEN_ENCRYPTION_KEY = oauth;
  }
});
