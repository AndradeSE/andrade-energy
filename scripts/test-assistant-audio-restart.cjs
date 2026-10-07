const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('services/on-device-voice.ts', 'utf8');
const adapter = source.slice(source.indexOf('    class RestartableAudioStream'), source.indexOf('    const whisper ='));
class AudioPcmStreamAdapter {
  onData(callback) { this.callback = callback; }
  async initialize(config) { this.config = config; this.callback = undefined; }
}
const capture = { hasAudio: false };
const context = { AudioPcmStreamAdapter, capture };
vm.createContext(context);
vm.runInContext(ts.transpileModule(adapter + '\nglobalThis.Stream = RestartableAudioStream;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
(async () => {
  const stream = new context.Stream();
  let packets = 0;
  stream.onData(() => packets++);
  for (let attempt = 0; attempt < 3; attempt++) {
    await stream.initialize({ audioSource: 6, sampleRate: 48000 });
    assert.equal(stream.config.audioSource, 1, 'Usar microfone mesmo quando a biblioteca perde a configuração');
    assert.equal(stream.config.sampleRate, 16000);
    assert.equal(stream.config.channels, 1);
    assert.equal(stream.config.bitsPerSample, 16);
    assert.equal(stream.config.bufferSize, 4096);
    assert.equal(capture.hasAudio, false);
    stream.callback({ data: new Uint8Array(8) });
    assert.equal(capture.hasAudio, true);
  }
  assert.equal(packets, 3);
  assert.match(source, /if \(!shouldContinue\(\)\) return;/);
  assert.match(source, /!prepared.capture.hasAudio/);
  console.log('PASS: callback PCM preservado em três reinícios e confirmação de áudio real');
})().catch(error => { console.error(error); process.exitCode = 1; });
