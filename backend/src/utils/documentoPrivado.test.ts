import assert from 'node:assert/strict';
import test from 'node:test';
import { caminhoDocumentoPrivado } from './documentoPrivado';
test('documento legado usa apenas seu bucket no próprio Storage, bloqueando SSRF', () => {
  const base = 'https://test.supabase.co';
  assert.equal(caminhoDocumentoPrivado('empresa/arquivo.pdf', 'faturas', base), 'empresa/arquivo.pdf');
  assert.equal(caminhoDocumentoPrivado(base + '/storage/v1/object/sign/faturas/empresa/arquivo.pdf?token=expired', 'faturas', base), 'empresa/arquivo.pdf');
  for (const origem of ['http://127.0.0.1/admin', 'http://169.254.169.254/latest/meta-data', base + '.attacker.invalid/storage/v1/object/public/faturas/a.pdf', 'https://test.supabase.co@attacker.invalid/a.pdf', base + '/storage/v1/object/sign/contratos/a.pdf', base + '/storage/v1/object/sign/faturas/%2e%2e%2fsecret']) {
    assert.throws(() => caminhoDocumentoPrivado(origem, 'faturas', base));
  }
});
