import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_VOICE_LINES } from "./voice-lines";
import { conversationContents, redactConversationText } from "./conversation-text";

test("Gemini recebe a pergunta atual e os turnos anteriores na ordem", () => {
  const contents = conversationContents("E se não chegar?", [{ role: "user", text: "Como funciona o convite?" }, { role: "model", text: "O convite chega por email." }]);
  assert.deepEqual(contents.map(turn => turn.role), ["user", "model", "user"]);
  assert.equal(contents[2].parts[0].text, "E se não chegar?");
});

test("texto externo remove links privados, email, CPF e valor monetário", () => {
  const text = redactConversationText("teste@exemplo.com 123.456.789-00 R$ 387,44 https://privado.test/fatura?token=segredo");
  assert.doesNotMatch(text, /exemplo|123|387|segredo/);
});

test("a voz externa só recebe frases públicas fixas", () => {
  assert.deepEqual(Object.keys(PUBLIC_VOICE_LINES).sort(), ["retry", "welcome"]);
  for (const line of Object.values(PUBLIC_VOICE_LINES)) {
    assert.ok(line.length < 150);
    assert.doesNotMatch(line, /\bCPF\b|\bCNPJ\b|\bfatura\b|\bR\$/i);
  }
});
