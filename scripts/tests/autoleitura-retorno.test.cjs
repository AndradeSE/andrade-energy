const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../../plugins/cemig-browser/autoleitura-retorno.js'), 'utf8');
const config = { uc: '720670501839', referencia: 'novembro/2026', dataLocal: '04/11/2026' };
const receipt = `Tudo certo!\nSua solicitação foi registrada com sucesso\nProtocolo\n1270520560\nNúmero da unidade consumidora\n7.206.705.018-39\nPeríodo de referência\nnovembro/2026\nData da autorização\n04/11/2026\nValor estimado\nR$ 100,00`;
function parse(text = receipt, overrides = {}, origin = 'https://www.atendimento.cemig.com.br') {
  const window = {}; window.top = window;
  const result = vm.runInNewContext(script, {
    window, location: { origin, pathname: '/portal/services/inform-reading' },
    document: { body: { innerText: text } }, __ANDRADE_CONFIG__: { ...config, ...overrides },
  });
  return JSON.parse(JSON.stringify(result));
}
test('reconhece recibo com UC, competência e data correspondentes', () => {
  assert.deepEqual(parse(), { estado: 'ENVIADA', protocolo: '1270520560', estimativa: 100 });
});
test('não exige protocolo diferente do cabeçalho anterior', () => {
  assert.equal(parse('Protocolo 1270520560\n' + receipt).estado, 'ENVIADA');
});
for (const [field, value] of [['uc', '1121361801894'], ['referencia', 'outubro/2026'], ['dataLocal', '03/11/2026']]) {
  test(`não aceita recibo de outra ${field}`, () => assert.equal(parse(receipt, { [field]: value }).estado, 'EM_REVISAO'));
}
test('não confunde formulário com recibo', () => assert.equal(parse('Confirmar leitura\nValor estimado R$ 100,00').estado, 'AGUARDANDO'));
test('não aceita recibo sem protocolo', () => assert.equal(parse(receipt.replace('1270520560', '')).estado, 'EM_REVISAO'));
test('não aceita dois recibos ambíguos', () => assert.equal(parse(receipt + '\n' + receipt).estado, 'EM_REVISAO'));
test('não aceita conteúdo de outro domínio', () => assert.equal(parse(receipt, {}, 'https://example.com').estado, 'EM_REVISAO'));
test('permite recibo sem estimativa sem inventar valor', () => assert.equal(parse(receipt.replace('R$ 100,00', '')).estimativa, null));
