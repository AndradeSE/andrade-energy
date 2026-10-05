import { strict as assert } from "node:assert";
import { test } from "node:test";
import { answerInConversation, answerLocally } from "./local-assistant";
const generator = { variant: "gerador", authenticated: true } as const;
test("only recognized navigation commands produce routes", () => assert.equal(answerLocally("Abra faturamento", generator).route, "/faturamento"));
test("consumer cannot navigate to generator billing", () => assert.equal(answerLocally("Abra faturamento", { ...generator, variant: "consumidor" }).route, undefined));
test("sensitive commands never produce an action", () => assert.equal(answerLocally("transferir dinheiro", generator).kind, "blocked"));
test("unauthenticated requests are blocked", () => assert.equal(answerLocally("abrir perfil", { ...generator, authenticated: false }).kind, "blocked"));
test("unknown request does not invent private data", () => assert.equal(answerLocally("qual e meu saldo", generator).kind, "unknown"));
test("follow-up keeps the previous topic without exposing a sensitive action", () => {
  const initial = answerInConversation("Onde vejo minhas faturas?", generator);
  assert.equal(initial.topic, "faturas");
  assert.equal(answerInConversation("E como faço?", generator, initial.topic).reply.kind, "help");
  assert.equal(answerInConversation("E pagar agora?", generator, initial.topic).reply.kind, "blocked");
});
