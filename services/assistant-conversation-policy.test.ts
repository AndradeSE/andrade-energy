import assert from "node:assert/strict";
import test from "node:test";
import { answerAssistantConversation } from "./assistant-conversation-policy";
const input = { mode: "local" as const, modelReady: true, question: "Explique o aplicativo", history: [{ from: "assistant" as const, text: "dado pessoal", private: true }], context: "guia verificado" };
test("modelo nativo recebe guia verificado, sem histórico privado nem envio online", async () => {
  let calls = 0;
  const response = await answerAssistantConversation(input, { online: async () => { throw Error("Não enviar"); }, local: async (turns, context) => { calls++; assert.equal(context, "guia verificado"); assert.equal(turns.length, 1); return "Resposta local"; } });
  assert.equal(response.text, "Resposta local"); assert.equal(response.private, true); assert.equal(calls, 1);
});
test("ajuda determinística e modelo ausente funcionam sem acionar serviço externo", async () => {
  const io = { online: async () => { throw Error("Não enviar"); }, local: async () => { throw Error("Não carregar"); } };
  assert.equal((await answerAssistantConversation({ ...input, help: "Fluxo verificado" }, io)).text, "Fluxo verificado");
  assert.match((await answerAssistantConversation({ ...input, modelReady: false }, io)).text, /Instale o modelo/);
  assert.match((await answerAssistantConversation(input, io)).text, /Não enviei esta conversa/);
});
test("modo online preserva o serviço e remove histórico privado", async () => {
  const response = await answerAssistantConversation({ ...input, mode: "online" }, { online: async (_, history) => { assert.equal(history.length, 0); return { text: "Resposta online", voiceAnswerId: "voz" }; }, local: async () => { throw Error("Não carregar"); } });
  assert.equal(response.voiceAnswerId, "voz");
});
