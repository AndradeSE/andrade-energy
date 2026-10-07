const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const timers = new Map();
let timerId = 0, installed = true, nativeCallbacks, localCallbacks, localStarts = 0, localStops = 0;
const native = {
  startNativePortugueseSpeech: async (final, error, activity, empty, options) => { nativeCallbacks = { final, error, empty, options }; return true; },
  stopNativePortugueseSpeech: async () => {}, finishNativePortugueseSpeech: async () => "nativo",
  nativeSpeechAvailabilityError: () => "Android indisponível",
};
const local = {
  isVoiceInstalled: () => installed,
  startContinuousListening: async (final, error, auto) => { localStarts++; localCallbacks = { final, error, auto }; },
  stopContinuousListening: async () => { localStops++; }, finishDictation: async () => "ditado local",
};
const exported = {};
const environment = { isPreviewEnvironment: false };
let onlineStarts = 0, onlineOptions;
const online = {
  startOnlineSpeech: async (final, error, activity, empty, options) => { onlineStarts++; onlineOptions = options; return true; },
  stopOnlineSpeech: async () => {}, finishOnlineSpeech: async () => "ditado online",
};
const code = ts.transpileModule(fs.readFileSync("services/assistant-speech-session.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(code, { exports: exported, console, setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id), require: name => {
  if (name === "./native-speech") return native;
  if (name === "./on-device-voice") return local;
  if (name === "./assistant-online-speech") return online;
  if (name === "../config/environment") return environment;
  throw new Error(`Unexpected dependency ${name}`);
} });
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
(async () => {
  let ready = 0, answer = "", failure = "";
  await exported.startAssistantSpeech(text => answer = text, error => failure = error, undefined, undefined, { owner: "dictation", onPartial: () => {}, onReady: () => ready++ });
  assert.equal(ready, 0);
  [...timers.values()].find(t => t.ms === 3500).fn();
  await flush();
  assert.equal(localStarts, 1);
  assert.equal(ready, 1);
  assert.equal(localCallbacks.auto, false);
  assert.equal(await exported.finishAssistantSpeech(), "ditado local");
  localCallbacks.final("teste de fala");
  assert.equal(answer, "teste de fala");
  await exported.stopAssistantSpeech("old-owner");
  assert.equal(localStops, 0);
  await exported.stopAssistantSpeech("dictation");
  assert.equal(localStops, 1);
  const stale = nativeCallbacks;
  stale.error("erro tardio");
  await flush();
  assert.equal(localStarts, 1);
  installed = false;
  await exported.startAssistantSpeech(() => {}, error => failure = error);
  const foregroundSession = nativeCallbacks;
  assert.equal(await exported.startAssistantSpeech(() => {}, () => {}, undefined, undefined, { owner: "wake-late", shouldContinue: () => false }), false);
  assert.equal(nativeCallbacks, foregroundSession); // Cancelada não toca a sessão atual.
  assert.equal(await exported.startAssistantSpeech(() => {}, () => {}, undefined, undefined, { owner: "wake-background" }), false);
  assert.equal(nativeCallbacks, foregroundSession); // Frase-chave não rouba o microfone.
  nativeCallbacks.error("não iniciou");
  await flush();
  assert.match(failure, /alternativo ainda não está instalado/);
  assert.equal(localStarts, 1); // Não baixa arquivos nem envia áudio à nuvem.
  installed = true;
  await exported.startAssistantSpeech(() => {}, () => {}, undefined, undefined, { owner: "wake-test", onPartial: () => {} });
  nativeCallbacks.error("falha");
  await flush();
  assert.equal(localCallbacks.auto, true);
  await exported.stopAssistantSpeech();
  environment.isPreviewEnvironment = true;
  assert.equal(await exported.startAssistantSpeech(() => {}, error => failure = error, undefined, undefined, { owner: "dictation" }), false);
  assert.equal(onlineStarts, 0);
  assert.match(failure, /Autorize/);
  await exported.stopAssistantSpeech();
  assert.equal(await exported.startAssistantSpeech(() => {}, () => {}, undefined, undefined, { owner: "dictation", audioConsent: true, onPartial: () => {} }), true);
  assert.equal(onlineStarts, 1);
  assert.equal(await exported.finishAssistantSpeech(), "ditado online");
  await exported.stopAssistantSpeech();
  await exported.startAssistantSpeech(() => {}, () => {}, undefined, undefined, { owner: "wake-test" });
  assert.equal(onlineStarts, 1); // Sem consentimento específico, hotword permanece local.
  await exported.stopAssistantSpeech();
  await exported.startAssistantSpeech(() => {}, () => {}, undefined, undefined, { owner: "wake-test", audioConsent: true });
  assert.equal(onlineStarts, 1); // Consentimento da conversa não autoriza escuta prévia.
  await exported.stopAssistantSpeech();
  await exported.startAssistantSpeech(() => {}, () => {}, undefined, undefined, { owner: "wake-test", wakeOnlineConsent: true, onPartial: () => {} });
  assert.equal(onlineStarts, 2);
  assert.equal(onlineOptions.wakeMode, true);
  assert.equal(onlineOptions.dictation, false);
  await exported.stopAssistantSpeech();
  console.log("PASS: falha/timeout Android usa voz local instalada, ditado, ativação, isolamento e nenhum download implícito");
})().catch(error => { console.error(error); process.exitCode = 1; });
