import assert from "node:assert/strict";
import { test } from "node:test";
import { publicSessionUser, revokeAuthenticatedSession } from "./session.js";
test("sessão pública não expõe senha, hashes ou segredos", () => {
  assert.deepEqual(publicSessionUser({ id: "u", nome: "Teste", papel_empresa: "LEITURA", senha: "secret", password_hash: "secret", token: "secret", two_factor_secret: "secret" }), { id: "u", nome: "Teste", papel_empresa: "LEITURA" });
});
test("logout revoga apenas a sessão autenticada do mesmo usuário", async () => {
  const calls: unknown[] = [];
  const query = { update: (value: unknown) => { calls.push(["update", value]); return query; }, eq: (key: string, value: string) => { calls.push(["eq", key, value]); return query; }, is: async (key: string, value: unknown) => { calls.push(["is", key, value]); return { error: null }; } };
  await revokeAuthenticatedSession({ from: table => { calls.push(["from", table]); return query; } }, "session-owned", "user-owned");
  assert.deepEqual(calls[0], ["from", "sessoes_usuarios"]);
  assert.deepEqual(calls.slice(2), [["eq", "id", "session-owned"], ["eq", "usuario_id", "user-owned"], ["is", "revogada_em", null]]);
  await assert.rejects(() => revokeAuthenticatedSession({ from: () => { throw Error("Não deve consultar"); } }, "", "user"));
});
