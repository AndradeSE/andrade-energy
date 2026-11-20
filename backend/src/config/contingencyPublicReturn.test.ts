import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isStaticOAuthReturn } from "./contingencyPublicReturn";

test("retorno estático OAuth pode ser exibido sem reivindicar executor", () => {
  for (const method of ["GET", "HEAD"]) {
    assert.equal(isStaticOAuthReturn(method, "/api/oauth/email/retorno-web"), true);
    assert.equal(isStaticOAuthReturn(method, "/api/oauth/email/retorno-web/"), true);
  }
});
test("callback, conclusão, mutações e caminhos semelhantes continuam protegidos", () => {
  for (const path of ["/api/oauth/email/callback/gmail", "/api/oauth/email/callback", "/api/conexoes-email/concluir", "/api/faturas", "/api/oauth/email/retorno-web/extra", "/api/oauth/email/retorno-web/../callback/gmail"]) {
    assert.equal(isStaticOAuthReturn("GET", path), false, path);
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal(isStaticOAuthReturn(method, "/api/oauth/email/retorno-web"), false);
  }
});
