const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const handlers = new Map();
const starts = [];
let microphoneAllowed = true;
let aborts = 0;
const native = {
  supportsOnDeviceRecognition: () => true,
  getSupportedLocales: async () => { throw new Error("Consulta de idiomas indisponível neste Android"); },
  requestPermissionsAsync: async () => ({ granted: microphoneAllowed }),
  addListener: (name, callback) => { handlers.set(name, callback); return { remove: () => handlers.delete(name) }; },
  start: options => starts.push(options), abort: () => aborts++,
};
const exported = {};
const code = ts.transpileModule(fs.readFileSync("services/native-speech.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(code, { exports: exported, setTimeout, clearTimeout, require: name => name === "react-native" ? { Platform: { OS: "android" } } : { requireOptionalNativeModule: () => native } });
(async () => {
  assert.equal(await exported.nativePortugueseSpeechAvailable(), true);
  let partial = "", finals = 0, ended = 0, ready = false;
  await exported.startNativePortugueseSpeech(() => finals++, error => { throw new Error(error); }, undefined, undefined, { onPartial: text => partial = text, onEnd: () => ended++, onReady: () => ready = true });
  // A consulta de idiomas simulada falha; isso não deve impedir start().
  assert.equal(ready, false);
  assert.equal(handlers.has("audiostart"), false);
  handlers.get("start")();
  assert.equal(ready, true); // Só informa microfone aberto depois do evento real.
  handlers.get("result")({ results: [{ transcript: "Solar" }], isFinal: false });
  assert.equal(partial, "Solar");
  assert.equal(finals, 0);
  handlers.get("end")();
  assert.equal(ended, 1); // Escuta pode reiniciar mesmo com parcial e sem resultado final.
  assert.equal(finals, 1); // Fala parcial é entregue quando o motor encerra sem final.
  assert.equal(handlers.size, 0);
  assert.equal(starts[0].requiresOnDeviceRecognition, true);
  assert.equal(starts[0].androidRecognitionServicePackage, undefined);
  const stale = await exported.startNativePortugueseSpeech(() => {}, () => {}, undefined, undefined, { shouldContinue: () => false });
  assert.equal(stale, false);
  assert.equal(starts.length, 1); // Não abre o microfone depois de cancelar/ir para segundo plano.
  await exported.startNativePortugueseSpeech(() => finals++, () => {});
  handlers.get("start")();
  handlers.get("result")({ results: [{ transcript: "pergunta normal" }], isFinal: true });
  assert.equal(finals, 2); // Cada sessão entrega a fala uma única vez.
  await exported.stopNativePortugueseSpeech();
  assert.equal(handlers.size, 0);
  await exported.startNativePortugueseSpeech(() => {}, () => {}, undefined, undefined, { owner: "dictation" });
  const previousAborts = aborts;
  await exported.stopNativePortugueseSpeech("old-wake-session");
  assert.equal(aborts, previousAborts);
  assert.equal(handlers.has("result"), true); // A escuta antiga não fecha o novo ditado.
  await exported.stopNativePortugueseSpeech("dictation");
  assert.equal(handlers.size, 0);
  let startupFailure = "", retries = 0;
  await exported.startNativePortugueseSpeech(() => {}, message => startupFailure = message, undefined, () => retries++, { onEnd: () => retries++ });
  handlers.get("end")();
  assert.match(startupFailure, /antes de abrir o microfone/);
  assert.equal(retries, 0); // Fim antes de captura não vira loop de novas tentativas.
  let interruption = "";
  await exported.startNativePortugueseSpeech(() => {}, message => interruption = message);
  handlers.get("start")();
  handlers.get("error")({ error: "aborted" });
  assert.match(interruption, /interrompeu/);
  assert.equal(handlers.size, 0);
  interruption = "";
  await exported.startNativePortugueseSpeech(() => {}, message => interruption = message);
  await exported.stopNativePortugueseSpeech();
  assert.equal(interruption, ""); // Cancelamento explícito não ativa fallback.
  microphoneAllowed = false;
  await assert.rejects(exported.startNativePortugueseSpeech(() => {}, () => {}), /microfone não foi autorizado/);
  console.log("PASS: resultado parcial, fim sem resultado final, cancelamento e compatibilidade com conversa");
})().catch(error => { console.error(error); process.exitCode = 1; });
