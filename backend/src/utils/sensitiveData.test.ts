import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criptografarDado, descriptografarDado } from './sensitiveData.js';

test('AES-GCM usa nonce novo e rejeita adulteração e chave incorreta', () => {
  const previous = process.env.FINANCIAL_DATA_ENCRYPTION_KEY;
  process.env.FINANCIAL_DATA_ENCRYPTION_KEY = 'test-key-a';
  try {
    const encrypted = criptografarDado('dado sensível de teste');
    assert.notEqual(encrypted, criptografarDado('dado sensível de teste'));
    assert.equal(descriptografarDado(encrypted), 'dado sensível de teste');
    for (const part of [1, 2, 3]) {
      const fields = encrypted.split('.');
      const bytes = Buffer.from(fields[part], 'base64');
      bytes[0] ^= 1;
      fields[part] = bytes.toString('base64');
      assert.throws(() => descriptografarDado(fields.join('.')));
    }
    process.env.FINANCIAL_DATA_ENCRYPTION_KEY = 'test-key-b';
    assert.throws(() => descriptografarDado(encrypted));
  } finally {
    if (previous === undefined) delete process.env.FINANCIAL_DATA_ENCRYPTION_KEY;
    else process.env.FINANCIAL_DATA_ENCRYPTION_KEY = previous;
  }
});
