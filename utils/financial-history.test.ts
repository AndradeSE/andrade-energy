import assert from 'node:assert/strict';
import test from 'node:test';
import { financialHistory } from './financial-history';
test('histórico separa liberação, tarifas e repasse sem transformar recusa em saída', () => {
  const items = financialHistory([
    { id: 'paga', status: 'RECEIVED', valor: 387.44, valor_liquido: 386.45 },
    { id: 'pendente', status: 'CONFIRMED', valor: 100, valor_liquido: 99 },
    { id: 'sem-tarifa', status: 'RECEIVED', valor: 50, valor_liquido: null },
  ], [{ id: 'falhou', status: 'REFUSED', valor: 386.45 }, { id: 'saiu', status: 'DONE', valor: 10 }]);
  const paid = items.find(item => item.id === 'cobranca:paga')!;
  assert.equal(paid.amount, 386.45); assert.equal(paid.fee, .99); assert.equal(paid.settled, true);
  assert.equal(items.find(item => item.id === 'cobranca:pendente')?.settled, false);
  assert.equal(items.find(item => item.id === 'cobranca:sem-tarifa')?.fee, null);
  assert.equal(items.find(item => item.id === 'transferencia:falhou')?.settled, false);
  assert.equal(items.find(item => item.id === 'transferencia:saiu')?.settled, true);
});
test('histórico preserva identidade, datas de atualização e valores desconhecidos', () => {
  const items = financialHistory([{ id: '1', status: 'RECEIVED', valor: 'bad', valor_liquido: null, atualizado_em: 'bad', criado_em: '2026-10-01T10:00:00Z' }],
    [{ id: '1', status: 'UNKNOWN', valor: null, atualizado_em: '2026-10-23T10:00:00Z' }]);
  assert.equal(items[0].id, 'transferencia:1'); assert.equal(items[0].status, 'Resultado em conferência');
  assert.equal(items[0].amount, null); assert.equal(items[1].amount, null); assert.equal(items[1].updatedAt, null);
  assert.equal(financialHistory([{ id: 'extra', valor: 10, valor_liquido: 12 }])[0].fee, null);
});
