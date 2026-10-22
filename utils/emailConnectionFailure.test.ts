import assert from "node:assert/strict";
import test from "node:test";
import { emailConnectionFailure, emailConnectionFailureMessage } from "./emailConnectionFailure";
test("preserva o motivo seguro da recusa Gmail e não exibe erro arbitrário do callback", () => {
  assert.equal(emailConnectionFailure(new Error("O Gmail foi conectado sem permissão para ler as faturas.")), "gmail-leitura");
  assert.match(emailConnectionFailureMessage("gmail-leitura"), /marque a permissão/);
  assert.equal(emailConnectionFailure({ response: { data: { message: "token=segredo" } } }), "oauth");
  assert.doesNotMatch(emailConnectionFailureMessage("token=segredo"), /segredo/);
});
