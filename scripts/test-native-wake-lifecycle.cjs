const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const handlers = new Map();
const starts = [];
const native = {
  supportsOnDeviceRecognition: () => true,
  getSupportedLocales: async () => ({ installedLocales: ["pt-BR"] }),
  requestPermissionsAsync: async () => ({ granted: true }),
  addListener: (name, callback) => { handlers.set(name, callback); return { remove: () => handlers.delete(name) }; },
  start: options => starts.push(options), abort: () => {},
};
const exported = {};
const code = ts.transpileModule(fs.readFileSync("services/native-speech.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(code, { exports: exported, setTimeout, clearTimeout, require: name => name === "react-native" ? { Platform: { OS: "android" } } : { requireOptionalNativeModule: () => native } });
(async () => {
  let partial = "", finals = 0, ended = 0;
  await exported.startNativePortugueseSpeech(() => finals++, error => { throw new Error(error); }, undefined, undefined, { onPartial: text => partial = text, onEnd: () => ended++ });
  handlers.get("result")({ results: [{ transcript: "E aí chat" }], isFinal: false });
  assert.equal(partial, "E aí chat");
  assert.equal(finals, 0);
  handlers.get("end")();
  assert.equal(ended, 1); // Escuta pode reiniciar mesmo com parcial e sem resultado final.
  assert.equal(handlers.size, 0);
  assert.equal(starts[0].requiresOnDeviceRecognition, true);
  const stale = await exported.startNativePortugueseSpeech(() => {}, () => {}, undefined, undefined, { shouldContinue: () => false });
  assert.equal(stale, false);
  assert.equal(starts.length, 1); // Não abre o microfone depois de cancelar/ir para segundo plano.
  await exported.startNativePortugueseSpeech(() => finals++, () => {});
  handlers.get("result")({ results: [{ transcript: "pergunta normal" }], isFinal: true });
  assert.equal(finals, 1); // Conversa e ditado existentes continuam recebendo só resultados finais.
  await exported.stopNativePortugueseSpeech();
  assert.equal(handlers.size, 0);
  console.log("PASS: resultado parcial, fim sem resultado final, cancelamento e compatibilidade com conversa");
})().catch(error => { console.error(error); process.exitCode = 1; });
