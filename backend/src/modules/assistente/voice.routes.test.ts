import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_VOICE_LINES } from "./voice-lines";
import { conversationContents, redactConversationText } from "./conversation-text";
import { GEMINI_CONVERSATION_MODEL, GEMINI_CONVERSATION_URL } from "./gemini-model";
import { geminiAnswer } from "./gemini-answer";
import { VoiceAnswerStore } from "./voice-answer-store";

test("voz só lê resposta pública da mesma sessão, com prazo e censura", () => {
  const store = new VoiceAnswerStore();
  const id = store.put("sessao-a", "Contato teste@exemplo.com R$ 123,00", 1000);
  assert.equal(store.get("sessao-b", id, 1001), undefined);
  assert.equal(store.get("sessao-a", id, 121000), undefined);
  assert.doesNotMatch(store.get("sessao-a", id, 1001)!, /exemplo|123/);
});

test("resposta longa válida não vira falha de conexão", () => {
  const answer = geminiAnswer({ candidates: [{ content: { parts: [{ text: "Uma orientação válida. ".repeat(60) }] } }] });
  assert.ok(answer && answer.length <= 800);
  assert.match(answer, /^Uma orientação válida/);
});

test("ignora pensamento e distingue resposta vazia", () => {
  assert.equal(geminiAnswer({ candidates: [{ content: { parts: [{ thought: true, text: "interno" }, { text: "Olá!" }] } }] }), "Olá!");
  assert.equal(geminiAnswer({ candidates: [{ content: { parts: [{ thought: true, text: "interno" }] } }] }), undefined);
});

test("conversa usa o modelo atual em vez do 2.5 restrito", () => {
  assert.equal(GEMINI_CONVERSATION_MODEL, "gemini-3.5-flash-lite");
  assert.equal(GEMINI_CONVERSATION_URL, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
});

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
