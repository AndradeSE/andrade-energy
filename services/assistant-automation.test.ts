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

test('alteração de cliente usa a usina autorizada e confirma o registro exato', async () => {
  const requests: string[] = [];
  let client = { id: 'c1', nome: 'Cliente Exemplo', telefone: '35999999999' };
  const io = {
    get: async (path: string) => { requests.push(path); return path.startsWith('/clientes?') ? [client] : { ...client }; },
    change: async (path: string, method: 'PUT' | 'PATCH', body: Record<string, unknown>) => {
      requests.push(`${method} ${path}`); client = { ...client, ...body }; return client;
    },
  };
  const draft = await prepareAutomation(parseAutomationCommand('altere o telefone do cliente Cliente Exemplo para 35988888888')!, context, io, 1000);
  assert.equal(draft.targetId, 'c1'); assert.equal(draft.before.telefone, '35999999999');
  await createAutomationExecutor()(draft, context, io, 2000);
  assert.ok(requests.includes('/clientes?usinaId=p1')); assert.ok(requests.includes('PUT /clientes/c1'));
  assert.equal(client.telefone, '35988888888');
});

test('cliente removido da usina após a revisão não pode ser editado', async () => {
  let accessible = true, writes = 0;
  const client = { id: 'c1', nome: 'Cliente Exemplo', telefone: '35999999999' };
  const io = { get: async (path: string) => path.startsWith('/clientes?') ? accessible ? [client] : [] : client,
    change: async () => { writes++; return client; } };
  const draft = await prepareAutomation(parseAutomationCommand('altere o telefone do cliente Cliente Exemplo para 35988888888')!, context, io, 1000);
  accessible = false;
  await assert.rejects(createAutomationExecutor()(draft, context, io, 2000), /não pertence mais/);
  assert.equal(writes, 0);
});

test('renomeia somente a usina selecionada e não aceita homônimos', async () => {
  let writes = 0;
  const plant = { id: 'p1', nome: 'Usina Exemplo' };
  const io = { get: async (path: string) => path === '/usinas' ? [plant] : plant,
    change: async (_path: string, _method: 'PUT' | 'PATCH', body: Record<string, unknown>) => { writes++; return { ...plant, ...body }; } };
  const command = parseAutomationCommand('renomeie a usina Usina Exemplo para Usina Teste')!;
  await assert.rejects(prepareAutomation(command, { ...context, plantId: 'other' }, io), /Selecione essa usina/);
  const draft = await prepareAutomation(command, context, io, 1000);
  const result = await createAutomationExecutor()(draft, context, io, 2000);
  assert.equal(result.nome, 'Usina Teste'); assert.equal(writes, 1);
  await assert.rejects(prepareAutomation(command, context, { ...io, get: async () => [plant, { ...plant, id: 'p2' }] }), /único cadastro/);
});

test('apelido do Consumidor é alterado apenas em uma de suas próprias UCs', async () => {
  const consumer: AutomationContext = { variant: 'CONSUMIDOR', scope: 'consumer:u1', allowedSections: ['Minha unidade'] };
  const unit = { id: 'u1', numero: '123456789', apelido: 'Casa' };
  const io = { get: async () => [unit], change: async (path: string, method: 'PUT' | 'PATCH', body: Record<string, unknown>) => {
    assert.equal(path, '/clientes/minhas-unidades/u1/apelido'); assert.equal(method, 'PATCH'); return { ...unit, ...body };
  } };
  const command = parseAutomationCommand('renomeie a UC 123456789 para Loja')!;
  const draft = await prepareAutomation(command, consumer, io, 1000);
  assert.equal((await createAutomationExecutor()(draft, consumer, io, 2000)).apelido, 'Loja');
  await assert.rejects(prepareAutomation({ ...command, target: '999999999' }, consumer, io), /único cadastro/);
});
