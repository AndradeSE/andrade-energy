const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '../../plugins/cemig-browser/autoleitura-confirmar.js'), 'utf8');
function fixture(changes = {}) {
  let clicks = 0;
  const config = { uc: '720670501839', leitura: '26829', referencia: 'novembro/2026', envioReservado: false, ...changes };
  const button = { getClientRects: () => [1], textContent: 'Confirmar leitura', click: () => clicks++ };
  const dialog = { getClientRects: () => [1], innerText: 'Confirmar leitura\nValor estimado R$ 100,00\nA leitura informada somente será aceita se a Cemig não realizar a leitura esse mês.', querySelectorAll: () => [button] };
  const window = {}; window.top = window;
  const document = { body: { innerText: 'Você está na unidade consumidora nº 7.206.705.018-39' }, querySelectorAll: (selector) => {
    if (selector.includes('role=')) return [dialog];
    if (selector.includes('03 - Leitura')) return [{ value: '26829' }];
    return [{ value: 'novembro/2026' }];
  } };
  const context = vm.createContext({ window, document, location: { origin: 'https://www.atendimento.cemig.com.br', pathname: '/portal/services/inform-reading' }, __ANDRADE_CONFIG__: config });
  return { run: () => vm.runInContext(script, context), clicks: () => clicks };
}
test('não envia sem reserva persistida', () => { const f = fixture(); assert.equal(f.run(), 'AGUARDANDO_RESERVA'); assert.equal(f.clicks(), 0); });
test('reserva permite exatamente um clique', () => { const f = fixture({ envioReservado: true }); assert.equal(f.run(), 'AGUARDANDO_RETORNO'); f.run(); assert.equal(f.clicks(), 1); });
for (const [field, value] of [['uc', '1121361801894'], ['leitura', '26830'], ['referencia', 'outubro/2026']]) {
  test(`bloqueia confirmação se ${field} não corresponde ao formulário`, () => {
    const f = fixture({ envioReservado: true, [field]: value });
    assert.equal(f.run(), 'DADOS_ALTERADOS'); assert.equal(f.clicks(), 0);
  });
}
