const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('backend/src/modules/assistente/azure-voice.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function load(env, fetch) {
  const exports = {};
  vm.runInNewContext(source, { exports, process: { env }, Buffer, Date, AbortSignal, fetch, console: { warn() {} } });
  return exports.azureVoice;
}
(async () => {
  let calls = 0;
  const wav = Buffer.alloc(48); wav.write('RIFF'); wav.write('WAVE', 8);
  const env = { AZURE_SPEECH_KEY: 'mock', AZURE_SPEECH_REGION: 'eastus', AZURE_SPEECH_TIER: 'F0' };
  const voice = load(env, async (url, options) => {
    calls++;
    assert.equal(url, 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1');
    assert.match(options.body, /FranciscaNeural/);
    assert.match(options.body, /&lt;teste&gt; &amp;/);
    assert.equal(options.headers['X-Microsoft-OutputFormat'], 'riff-24khz-16bit-mono-pcm');
    return { ok: true, arrayBuffer: async () => wav };
  });
  assert.equal(await voice('<teste> &'), wav.toString('base64'));
  assert.equal(await voice('x'.repeat(1601)), undefined);
  assert.equal(await load({ ...env, AZURE_SPEECH_TIER: 'S0' }, () => { throw Error('Paid tier must not run'); })('Oi'), undefined);
  assert.equal(await load({ ...env, AZURE_SPEECH_REGION: 'evil.example/' }, () => { throw Error('Invalid region'); })('Oi'), undefined);
  const limited = load(env, async () => { calls++; return { ok: false, status: 429 }; });
  assert.equal(await limited('Oi'), undefined);
  assert.equal(await limited('Oi'), undefined);
  assert.equal(calls, 2);
  assert.equal(await load(env, async () => ({ ok: true, arrayBuffer: async () => Buffer.from('not audio') }))('Oi'), undefined);
  console.log('Azure voice: F0-only, SSML escaping, WAV validation and quota cooldown passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
