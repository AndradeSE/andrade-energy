const assert = require('node:assert/strict');
const test = require('node:test');
const decode = require('../../vendor/decode-uri-component');
const queryString = require('query-string');

test('links preserve UTF-8, malformed escapes and query parameters', () => {
  assert.equal(decode('Jo%C3%A3o%20Solar'), 'João Solar');
  assert.equal(decode('%G1%20Solar'), '%G1 Solar');
  assert.deepEqual({ ...queryString.parse('nome=Jo%C3%A3o&unidadeId=uc-1') }, { nome: 'João', unidadeId: 'uc-1' });
});

test('a long malformed URL finishes without recursive decoding', { timeout: 2000 }, () => {
  const input = '%C0%AF'.repeat(10000);
  const start = performance.now();
  assert.equal(decode(input), input);
  assert.ok(performance.now() - start < 1000);
});
