import assert from "node:assert/strict";
import { test } from "node:test";
import { emailOAuthState, emailWebReturn } from "./web-return.js";
test("origem web preserva entropia e usa retorno fixo sem abrir aplicativo", () => {
  const random = "a".repeat(43);
  const state = emailOAuthState(random, "WEB");
  assert.equal(state, `web_${random}`);
  const url = new URL(emailWebReturn(state, "SUCESSO", "https://api.example")!);
  assert.equal(url.origin, "https://api.example"); assert.equal(url.pathname, "/api/oauth/email/retorno-web");
  assert.equal(url.searchParams.has("state"), false); assert.equal(url.searchParams.get("status"), "AUTORIZADO");
});
test("aplicativos mantêm retorno nativo e destino fornecido pelo cliente é ignorado", () => {
  const random = "b".repeat(43);
  assert.equal(emailOAuthState(random, "https://attacker.invalid"), random);
  assert.equal(emailWebReturn(random, "SUCESSO", "https://api.example"), null);
  assert.equal(emailWebReturn("web_invalid", "SUCESSO", "https://api.example"), null);
  assert.equal(new URL(emailWebReturn(`web_${random}`, "EXPIRADO", "https://api.example")!).searchParams.get("status"), "ERRO");
});
