import assert from "node:assert/strict";
import test from "node:test";
import { assistantConnectionError, speechStatusReply } from "./assistant-diagnostics";
test("confirma transcrição recebida sem inventar acesso ao microfone", () => {
  assert.match(speechStatusReply("Você está me ouvindo?", true)!, /transcrita/);
  assert.match(speechStatusReply("Está me ouvindo?", false)!, /mensagem escrita/);
  assert.equal(speechStatusReply("Como funciona o contrato?", true), undefined);
});
test("falha de infraestrutura não culpa a pergunta", () => {
  assert.match(assistantConnectionError({ response: { status: 503, data: { code: "GEMINI_CREDENTIAL" } } }), /configuração/);
  assert.match(assistantConnectionError({ response: { status: 401 } }), /sessão/);
  assert.doesNotMatch(assistantConnectionError({}), /segurança|outra forma/);
});
