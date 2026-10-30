import { strict as assert } from "node:assert";
import { test } from "node:test";
import { emitirAutorizacaoPix, verificarAutorizacaoPix } from "./autorizacaoPix";

process.env.FINANCIAL_DATA_ENCRYPTION_KEY = "chave-apenas-deste-teste-local";
const usuario = { id: "teste", empresa_id: "empresa-teste", senha: "hash-teste" };
const segredo = "segredo-criptografado-teste";
const agora = 1_000_000;
test("cadastro Pix permanece autorizado após a troca do TOTP e expira em cinco minutos", () => {
  const token = emitirAutorizacaoPix(usuario, segredo, 33, "carteira", agora);
  assert.equal(verificarAutorizacaoPix(token, usuario, segredo, "carteira", agora + 120_000), 33);
  assert.equal(verificarAutorizacaoPix(token, usuario, segredo, "carteira", agora + 299_999), 33);
  assert.throws(() => verificarAutorizacaoPix(token, usuario, segredo, "carteira", agora + 300_000));
});
test("autorização é vinculada a usuário, empresa, senha, autenticador e ambiente financeiro", () => {
  const token = emitirAutorizacaoPix(usuario, segredo, 33, "carteira", agora);
  for (const alterado of [{ ...usuario, id: "outro" }, { ...usuario, empresa_id: "outra" }, { ...usuario, senha: "nova" }]) {
    assert.throws(() => verificarAutorizacaoPix(token, alterado, segredo, "carteira", agora));
  }
  assert.throws(() => verificarAutorizacaoPix(token, usuario, "novo-autenticador", "carteira", agora));
  assert.throws(() => verificarAutorizacaoPix(token, usuario, segredo, "comercial", agora));
});
test("rejeita adulteração, payload em texto e autorização emitida no futuro", () => {
  const token = emitirAutorizacaoPix(usuario, segredo, 33, "carteira", agora);
  assert.throws(() => verificarAutorizacaoPix(token.replace(/^v1\../, "v1.A"), usuario, segredo, "carteira", agora));
  assert.throws(() => verificarAutorizacaoPix("{}", usuario, segredo, "carteira", agora));
  assert.throws(() => verificarAutorizacaoPix(token, usuario, segredo, "carteira", agora - 1));
});
