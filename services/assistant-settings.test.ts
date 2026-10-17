import assert from "node:assert/strict";
import test from "node:test";
import { guideAppAnswer, verifiedAppGuide } from "./assistant-app-guide";
import { detectCapability } from "./assistant-capabilities";

test("Solar explica as preferências atuais nos dois apps", () => {
  for (const audience of ["gerador", "consumidor"] as const) {
    const answer = guideAppAnswer("como desligar a voz da solar", audience);
    assert.match(String(answer), /Configurações da Solar/);
    assert.match(String(answer), /retirado do Perfil/);
    assert.match(String(answer), /interrompe a escuta/);
    assert.match(verifiedAppGuide(audience), /Gemini Live somente após autorização/);
  }
});
test("pedir alteração de voz abre revisão, sem executar mudança", () => {
  for (const question of ["desative a voz da Solar", "abra as configurações da Solar", "ative o botão flutuante do assistente"]) {
    assert.deepEqual(detectCapability(question), { module: "assistente-config", mode: "action", review: false });
  }
  assert.notEqual(detectCapability("ative o faturamento automatico")?.module, "assistente-config");
});
test("guia diferencia compensação real, projeção e recebimento por competência", () => {
  const answer = String(guideAppAnswer("como funciona o rateio na operacao", "gerador"));
  assert.match(answer, /não é necessário cadastrar rateio interno/);
  assert.match(answer, /setembro paga em outubro/);
  assert.match(answer, /não comprova compensação/);
});