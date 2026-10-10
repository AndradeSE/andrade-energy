const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('config/environment.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function support(runtimeVersion, flag) {
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({ runtimeVersion, channel: 'preview-gerador' }), process: { env: { EXPO_PUBLIC_ENABLE_GEMINI_LIVE: flag } } });
  return exports.supportsAssistantLive;
}
for (const runtime of ['1.0.4-preview-live-awake', '1.0.4-production-live-awake']) {
  assert.equal(support(runtime, undefined), true);
  assert.equal(support(runtime, '0'), true);
}
assert.equal(support('1.0.3', '1'), false);
assert.equal(support(null, '1'), true);
assert.equal(support(null, undefined), false);
console.log('PASS: Live uses native runtime even when OTA flags are absent; older APKs stay protected.');
