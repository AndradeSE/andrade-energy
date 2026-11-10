import { test } from "node:test";
import assert from "node:assert/strict";
import { referenciasAuthInativas } from "./neonSnapshot";
const captured = "2026-11-10T12:00:00Z";
const user = { id: "user", auth_user_id: "aaaaaaaa-1111-4111-8111-111111111111", ativo: false, senha: "$argon2id$v=19$private-fixture" };
const tables = (u = user, rows: string[] = []) => [{ name: "usuarios", rows: [JSON.stringify(u)] }, { name: "sessoes_usuarios", rows }];
test("preserva somente referência inativa com senha própria e sem sessão válida", () => {
  assert.deepEqual(referenciasAuthInativas(tables(), captured), [user.auth_user_id]);
  assert.throws(() => referenciasAuthInativas(tables({ ...user, ativo: true }), captured));
  assert.throws(() => referenciasAuthInativas(tables({ ...user, senha: "texto-simples" }), captured));
  assert.throws(() => referenciasAuthInativas(tables(user, [JSON.stringify({ usuario_id: "user", expira_em: "2026-11-11", revogada_em: null })]), captured));
  assert.throws(() => referenciasAuthInativas([{ name: "usuarios", rows: [JSON.stringify(user)] }], captured));
  assert.deepEqual(referenciasAuthInativas(tables(user, [JSON.stringify({ usuario_id: "user", expira_em: "2026-11-11", revogada_em: captured })]), captured), [user.auth_user_id]);
});
