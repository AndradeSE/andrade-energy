import assert from "node:assert/strict";
import { test } from "node:test";
import { exigirPermissaoLeituraGmail, ESCOPO_LEITURA_GMAIL } from "./gmailPermissoes.policy";

test("login com nome e e-mail não autoriza a leitura de faturas", () => {
  assert.throws(() => exigirPermissaoLeituraGmail(["openid", "email", "profile"]), (erro: any) => erro.codigoGmail === "GMAIL_LEITURA_NAO_AUTORIZADA");
});
test("aceita somente o escopo de leitura explicitamente concedido", () => {
  assert.doesNotThrow(() => exigirPermissaoLeituraGmail([ESCOPO_LEITURA_GMAIL]));
  assert.doesNotThrow(() => exigirPermissaoLeituraGmail("openid " + ESCOPO_LEITURA_GMAIL));
  assert.throws(() => exigirPermissaoLeituraGmail(undefined));
});
