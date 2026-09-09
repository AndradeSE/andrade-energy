import assert from "node:assert/strict";
import test from "node:test";
import { conferirSenha, protegerSenha, senhaEstaProtegida } from "./password";

test("protege senhas novas com Argon2id", async () => {
  const hash = await protegerSenha("senha-forte-123");
  assert.equal(senhaEstaProtegida(hash), true);
  assert.equal(await conferirSenha("senha-forte-123", hash), true);
  assert.equal(await conferirSenha("senha-errada", hash), false);
});

test("aceita senha legada apenas para migração no próximo login", async () => {
  assert.equal(await conferirSenha("legada", "legada"), true);
  assert.equal(await conferirSenha("outra", "legada"), false);
});
