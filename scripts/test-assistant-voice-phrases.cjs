const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/assistant-voice-phrases.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsForTest, Uint8Array, DataView });
const { AssistantVoicePhrases } = exportsForTest;
function pcm(ms, amplitude = 0) {
  const bytes = new Uint8Array(ms * 32);
  const view = new DataView(bytes.buffer);
  for (let n = 0; n < bytes.length / 2; n++) view.setInt16(n * 2, Math.round(Math.sin(n / 7) * amplitude), true);
  return bytes;
}
function concat(...parts) { return new Uint8Array(Buffer.concat(parts)); }
const segmenter = new AssistantVoicePhrases();
assert.equal(segmenter.push(pcm(60000)).length, 0, 'Silêncio não deve gerar inferência');
assert.ok(segmenter.bufferedBytes <= 10000, 'Silêncio não acumula memória');
segmenter.reset();
assert.equal(segmenter.push(concat(pcm(400), pcm(80, 8000), pcm(800))).length, 0, 'Estalo curto deve ser rejeitado');
segmenter.reset();
const phrase = concat(pcm(2700), pcm(450, 3000), pcm(200), pcm(550, 3000), pcm(800));
const output = [];
// O comando atravessa a antiga fronteira de 3s e os pacotes têm tamanho ímpar.
for (let i = 0; i < phrase.length; i += 4093) output.push(...segmenter.push(phrase.subarray(i, i + 4093)));
assert.equal(output.length, 1, 'A frase deve permanecer inteira através de fronteiras de pacotes/3s');
assert.ok(output[0].length >= (300 + 450 + 200 + 550 + 500) * 32);
const expected = phrase.subarray(2400 * 32, 4400 * 32);
assert.deepEqual(Buffer.from(output[0]), Buffer.from(expected), 'Preservar PCM16, pre-roll e pausa sem mudar bytes');
segmenter.reset();
const two = segmenter.push(concat(pcm(500, 2500), pcm(900), pcm(500, 2500), pcm(900)));
assert.equal(two.length, 2, 'Falas separadas devem gerar frases separadas');
segmenter.reset();
const long = segmenter.push(pcm(60000, 3000));
assert.ok(long.length >= 12);
assert.ok(long.every(audio => audio.length <= 5000 * 32));
assert.ok(segmenter.bufferedBytes < 180000, 'Fala contínua mantém memória limitada');
segmenter.reset();
assert.equal(segmenter.bufferedBytes, 0);
console.log('PASS: silêncio, estalo, frase completa entre pacotes, pausas, PCM intacto e memória limitada');
