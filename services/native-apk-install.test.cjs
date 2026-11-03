const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(name, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, name), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; } });
  return exports;
}
const release = { applicationId: 'com.andradese.energy.gerador.preview', build: 3, bytes: 42, md5: 'a'.repeat(32), url: 'https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-gerador-preview.apk' };
function fixture({ cached = false, corrupt = false, status = 200 } = {}) {
  const calls = []; let reads = 0;
  const valid = { exists: true, size: 42, md5: 'a'.repeat(32) };
  const fileSystem = {
    cacheDirectory: 'file:///cache/',
    getInfoAsync: async () => ++reads === 1 && !cached ? { exists: false } : { ...valid, md5: corrupt ? 'b'.repeat(32) : valid.md5 },
    createDownloadResumable: (url, destination, options, progress) => ({ downloadAsync: async () => { calls.push('download'); progress({ totalBytesWritten: 21 }); return { status, uri: destination }; }, cancelAsync: async () => calls.push('cancel') }),
    deleteAsync: async () => calls.push('delete'),
    getContentUriAsync: async () => 'content://andrade/apk',
  };
  const installer = { startActivityAsync: async (action, params) => calls.push({ action, params }) };
  const service = load('native-apk-install.ts', { 'expo-file-system/legacy': fileSystem, 'expo-intent-launcher': installer, './native-apk-release': load('native-apk-release.ts') });
  return { calls, run: signal => service.installNativeApk(release, release.applicationId, '2', () => {}, signal) };
}
test('downloads valid APK and opens Android installer with temporary read permission', async () => {
  const f = fixture(); await f.run();
  assert.equal(f.calls[0], 'download');
  assert.equal(f.calls[1].action, 'android.intent.action.VIEW');
  assert.equal(f.calls[1].params.data, 'content://andrade/apk');
  assert.equal(f.calls[1].params.type, 'application/vnd.android.package-archive');
  assert.equal(f.calls[1].params.flags, 1);
});
test('reuses verified cache rather than downloading again', async () => {
  const f = fixture({ cached: true }); await f.run(); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].action, 'android.intent.action.VIEW');
});
test('corrupt download is deleted and never sent to installer', async () => {
  const f = fixture({ corrupt: true }); await assert.rejects(f.run(), /incompleto/); assert.deepEqual(f.calls, ['download', 'delete']);
});
test('HTTP failure never opens installer', async () => {
  const f = fixture({ status: 403 }); await assert.rejects(f.run(), /concluir/); assert.deepEqual(f.calls, ['download']);
});
test('cancellation prevents download and installation', async () => {
  const f = fixture(); const controller = new AbortController(); controller.abort(); await assert.rejects(f.run(controller.signal), /cancelado/); assert.equal(f.calls.length, 0);
});
