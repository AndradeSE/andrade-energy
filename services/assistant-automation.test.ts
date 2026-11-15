import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareAutomation, createAutomationExecutor, parseAutomationCommand, type AutomationContext } from '../shared/solar-automation';

const context: AutomationContext = { variant: 'GERADOR', scope: 'user:plant', plantId: 'p1', allowedSections: ['Perfil', 'Clientes', 'Usinas'] };
function fixture() {
  let profile = { id: 'user1', nome: 'Pessoa Exemplo', email: 'teste@example.com', telefone: '35999999999' };
  let writes = 0;
  const io = { get: async () => ({ ...profile }), change: async (_path: string, _method: 'PUT' | 'PATCH', body: Record<string, unknown>) => { writes++; profile = { ...profile, ...body }; return profile; } };
  return { io, writes: () => writes, setName: (name: string) => { profile.nome = name; } };
}
test('revisão cadastral prepara antes/depois sem salvar; cancelamento não envia alteração', async () => {
  const f = fixture();
  const command = parseAutomationCommand('altere meu nome para Pessoa Teste')!;
  const draft = await prepareAutomation(command, context, f.io, 1000);
  assert.equal(draft.before.nome, 'Pessoa Exemplo'); assert.equal(draft.after.nome, 'Pessoa Teste');
  assert.equal(f.writes(), 0); assert.ok(Object.isFrozen(draft));
});
test('confirmação válida salva uma vez e impede clique duplo', async () => {
  const f = fixture(); const draft = await prepareAutomation(parseAutomationCommand('altere meu nome para Pessoa Teste')!, context, f.io, 1000);
  const execute = createAutomationExecutor();
  const results = await Promise.allSettled([execute(draft, context, f.io, 2000), execute(draft, context, f.io, 2000)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(f.writes(), 1);
});
test('mudança de ambiente, expiração e cadastro modificado impedem confirmação', async () => {
  for (const reason of ['scope', 'expiry', 'record'] as const) {
    const f = fixture(); const draft = await prepareAutomation(parseAutomationCommand('altere meu nome para Pessoa Teste')!, context, f.io, 1000);
    if (reason === 'record') f.setName('Nome Alterado');
    await assert.rejects(createAutomationExecutor()(draft, reason === 'scope' ? { ...context, scope: 'other' } : context, f.io, reason === 'expiry' ? 302000 : 2000));
    assert.equal(f.writes(), 0);
  }
});
test('valor inválido ou falta de acesso não consulta nem altera cadastro', async () => {
  let calls = 0; const io = { get: async () => { calls++; return {}; }, change: async () => { calls++; return {}; } };
  await assert.rejects(prepareAutomation(parseAutomationCommand('altere meu email para invalido')!, context, io));
  await assert.rejects(prepareAutomation(parseAutomationCommand('altere meu nome para Pessoa Teste')!, { ...context, allowedSections: [] }, io));
  assert.equal(calls, 0);
});
