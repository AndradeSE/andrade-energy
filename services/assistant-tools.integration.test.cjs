const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the real dispatcher and selectors. Only authenticated service boundaries
// and native release metadata are replaced; no network requests or writes occur.
function fixture() {
  const calls = [];
  const secureValues = new Map();
  const client = { id: 'c1', nome: 'Cliente Exemplo', email: 'teste@example.com', status: 'ATIVO' };
  const unit = { id: 'u1', numero: '854652001898', cliente_id: client.id, clientes: client,
    consumo_medio_kwh: 431, desconto_percentual: 40, status: 'ATIVA' };
  const invoices = [
    { id: 'f2', cliente_id: 'c2', unidade_consumidora_id: 'u2', numero_instalacao: '999999001899', referencia: '11/2026', consumo_kwh: 900, status: 'EMITIDA', pdf_cemig_url: 'https://example.com/outra.pdf' },
    { id: 'f1', cliente_id: client.id, unidade_consumidora_id: unit.id, numero_instalacao: unit.numero, referencia: '10/2026', consumo_kwh: 420, status: 'EMITIDA', pdf_cemig_url: 'https://example.com/cemig.pdf', valor_total: 200 },
  ];
  const fn = (name, value) => async (...args) => { calls.push([name, args]); return typeof value === 'function' ? value(...args) : value; };
  const stubs = {
    './app-release-notes': { appReleaseSummary: () => 'Solar · revisão de teste · atualização disponível' },
    '../config/api': { default: { post: fn('post', { data: { trechos: ['Cláusula de teste'], temTexto: true } }) }, __esModule: true },
    './clientes.service': {
      listarClientes: fn('listarClientes', [client]), buscarCliente: fn('buscarCliente', client),
      listarUnidadesGestor: fn('listarUnidadesGestor', [unit]), listarMinhasUnidades: fn('listarMinhasUnidades', [unit]),
      listarAutoleituras: fn('listarAutoleituras', [{ data_programada: '2026-11-14', leitura_kwh: 1234, estado: 'RECEBIDA' }]),
      listarMinhasAutoleituras: fn('listarMinhasAutoleituras', []),
      listarFaturasAnexadasCliente: fn('listarFaturasAnexadasCliente', [{ id: 'a1', nome: 'Conta anexada', url: 'https://example.com/anexo.pdf' }]),
    },
    './faturas.service': { listarFaturas: fn('listarFaturas', invoices), buscarFatura: fn('buscarFatura', id => invoices.find(f => f.id === id)), obterRelatorioCalculoFatura: fn('obterRelatorioCalculoFatura', 'https://example.com/calculo.pdf') },
    './contratos.service': { listarContratosDaEmpresa: fn('listarContratosDaEmpresa', [{ id: 'k1', clientes: client, status: 'VIGENTE' }]), buscarContratoDaUnidade: fn('buscarContratoDaUnidade', { status: 'VIGENTE', contrato_assinado_url: 'https://example.com/contrato.pdf' }), baixarPropostaDaUnidade: fn('baixarPropostaDaUnidade', '/proposta.pdf') },
    './cotas-servicos.service': { listServiceQuotas: fn('listServiceQuotas', { servicos: [{ servico: 'render', rotulo: 'Render', unidade: 'horas', leitura: { usado: 5, limite: 10, restante: 5 } }] }) },
    './auth.service': { me: fn('me', client), listarMeusPedidosDePrivacidade: fn('listarMeusPedidosDePrivacidade', [{ detalhes: { tipo: 'ACESSO', status: 'RECEBIDO' } }]) },
    './dashboard.service': { buscarDashboard: fn('buscarDashboard', { economiaMes: 80, economiaAcumulada: 800, saldoAtual: 100, ultimaFatura: { energiaCompensada: 300 } }) },
    './carteira.service': { carregarCarteira: fn('carregarCarteira', { status: 'ATIVA', saldoDisponivel: 150 }) },
    './colaboradores.service': { listarColaboradores: fn('listarColaboradores', { colaboradores: [{ nome: 'Equipe Exemplo' }], convites: [] }), listarAuditoriaColaboradores: fn('listarAuditoriaColaboradores', [{ acao: 'CONSULTA' }]) },
    './fechamentos.service': { listarFechamentos: fn('listarFechamentos', [{ usina_id: 'p1', competencia: '10/2026', energia_gerada: 10000, status: 'ABERTO' }, { usina_id: 'p2', competencia: '09/2026', status: 'FORA_DO_CONTEXTO' }]) },
    './usinas.service': { listarUsinas: fn('listarUsinas', [{ nome: 'Usina Exemplo' }]), buscarDashboardUsina: fn('buscarDashboardUsina', { competencia: '10/2026', energiaGerada: 10000, unidadeGeradora: { id: 'ug1' } }), obterSaldoAncora: fn('obterSaldoAncora', { saldoKwh: 500 }), listarInversoresDaUsina: fn('listarInversoresDaUsina', [{ nome: 'Inversor Exemplo' }]) },
    './empresas.service': { listarMinhasEmpresas: fn('listarMinhasEmpresas', [{ nome: 'Ambiente Exemplo' }]) },
    './comercial.service': { obterMinhaAssinatura: fn('obterMinhaAssinatura', { assinatura: { plano: { nome: 'Plano Exemplo' } } }), obterTermosAssinatura: fn('obterTermosAssinatura', { documentos: [{ titulo: 'Termos', versao: '1', conteudo: 'Texto de teste' }] }), obterPainelComercial: fn('obterPainelComercial', { resumo: { total: 3 }, planos: [], assinaturas: [] }) },
    './recebimento-faturas.service': { obterRecebimentoFaturas: fn('obterRecebimentoFaturas', { ativo: true, configurado: true, status: 'ATIVO' }) },
    './conexoes-email.service': { listarConexoesEmail: fn('listarConexoesEmail', [{ provedor: 'GMAIL', status: 'CONECTADO' }]) },
    './financeiro.service': { carregarFinanceiro: fn('carregarFinanceiro', { totalFaturas: 2 }) },
    './notificacoes.service': { listarNotificacoesApp: fn('listarNotificacoesApp', []) },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const localRequire = spec => {
      if (spec === 'expo-secure-store') return {
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
        getItemAsync: async key => secureValues.get(key) ?? null,
        setItemAsync: async (key, value) => { secureValues.set(key, value); },
      };
      if (stubs[spec]) return stubs[spec];
      if (spec.startsWith('.')) return load(path.resolve(path.dirname(file), spec + '.ts'));
      return require(spec);
    };
    vm.runInThisContext(require('node:module').wrap(compiled), { filename: file })(module.exports, localRequire, module, file, path.dirname(file));
    return module.exports;
  }
  return { ...load(path.join(__dirname, 'assistant-tools.ts')), ...load(path.join(__dirname, 'assistant-capabilities.ts')),
    ...load(path.join(__dirname, 'assistant-live-account.ts')),
    ...load(path.join(__dirname, 'assistant-unit-query.ts')),
    ...load(path.join(__dirname, 'assistant-economy-calculator.ts')),
    reloadHistory: () => { const file = path.join(__dirname, 'assistant-chat-history.ts'); cache.delete(file); return load(file); }, calls, unit,
    ctx: { generator: true, plantId: 'p1', unitId: unit.id, unitNumber: unit.numero, clientId: client.id, role: 'ADMIN' } };
}

const scenarios = [
  ['leituras', 'consulte histórico de leituras da UC final 1898', /1.234.*RECEBIDA.*não confirmado/s],
  ['cotas', 'qual a cota do Render', /5 usados/],
  ['assistente-config', 'configurações da Solar', /preferências/],
  ['perfil', 'meus dados', /teste@example.com/],
  ['economia', 'qual a economia da UC final 1898', /800,00/],
  ['carteira', 'qual meu saldo disponível', /150,00/],
  ['equipe', 'liste colaboradores', /Equipe Exemplo/],
  ['atividade', 'consulte auditoria', /CONSULTA/],
  ['operacao', 'consulte rateio', /10\/2026/],
  ['inversores', 'liste inversores', /Inversor Exemplo/],
  ['recebimento', 'consulte recebimento automático', /GMAIL: CONECTADO/],
  ['assinatura', 'qual meu plano atual', /Plano Exemplo/],
  ['termos', 'consulte termos', /Texto de teste/],
  ['empresas', 'liste empresas', /Ambiente Exemplo/],
  ['comercial', 'consulte comercial', /Geradores: 3/],
  ['privacidade', 'consulte pedidos de privacidade', /ACESSO/],
  ['contratos', 'contratos', /VIGENTE/],
  ['conta-luz', 'qual foi o consumo da UC final 1898', /420 kWh/],
  ['calculo', 'PDF da memória de cálculo', /documento/],
  ['anexos', 'consulte anexos', /1 anexos/],
  ['proposta', 'consulte proposta', /proposta disponível/],
  ['pagamento', 'consulte boleto', /Escolha a fatura/],
  ['clientes', 'qual o email do cliente Cliente Exemplo', /teste@example.com/],
  ['usinas', 'liste usinas', /Usina Exemplo/],
  ['unidades', 'qual o consumo médio do cliente Cliente Exemplo', /431 kWh/],
  ['faturamento', 'liste faturas', /faturas no seu acesso/],
  ['tutoriais', 'tutoriais', /desativados/],
  ['sobre', 'quais foram as últimas atualizações', /revisão de teste/],
];
for (const [module, phrase, expected] of scenarios) test(`pedido → ferramenta → resposta: ${module}`, async () => {
  const f = fixture(); const intent = f.detectCapability(phrase);
  assert.equal(intent?.module, module, phrase);
  const reply = await f.queryLiveAccount(phrase, f.ctx);
  assert.match(reply.text, expected);
  assert.doesNotMatch(reply.text, /FORA_DO_CONTEXTO/);
});

test('documento da UC explícita resolve o PDF e mantém o consumo correspondente', async () => {
  const f = fixture(); const question = 'Abra a fatura da Cemig da UC final 1898';
  const reply = await f.executeAssistantTool(f.detectCapability(question), f.ctx, question);
  assert.equal(reply.documents.length, 1);
  assert.equal(reply.documents[0].id, 'f1');
  assert.deepEqual(await f.resolveAssistantDocument(reply.documents[0]), { url: 'https://example.com/cemig.pdf' });
  const followup = 'Qual foi o consumo dessa UC?';
  const answer = await f.executeAssistantTool(f.detectCapability(followup), f.ctx, followup);
  assert.match(answer.text, /420 kWh/); assert.doesNotMatch(answer.text, /900 kWh/);
});

test('pedido de PDF sem repetir o número respeita a UC da sessão', async () => {
  const f = fixture(); const question = 'Abra a fatura da Cemig';
  const reply = await f.executeAssistantTool(f.detectCapability(question), { ...f.ctx, clientId: undefined }, question);
  assert.deepEqual(reply.documents.map(doc => doc.id), ['f1']);
});

test('economia consultada no Gerador abre a UC correspondente, sem tela do Consumidor', async () => {
  const f = fixture();
  const reply = await f.queryLiveAccount('Qual a economia da UC final 1898?', { ...f.ctx, unitId: undefined });
  assert.deepEqual(reply.actions, [{ label: 'Ver economia · UC 854652001898', route: '/unidades/[id]', params: { id: 'u1' }, review: false }]);
});

test('memória de cálculo e mudança de assunto não continuam uma simulação', () => {
  const f = fixture();
  assert.equal(f.asksEconomyCalculation('Consulte memória de cálculo da fatura'), false);
  for (const phrase of ['Consulte comercial', 'qual o desconto do cliente', 'consulte fatura', 'qual meu plano atual']) {
    assert.equal(f.continuesEconomyCalculation(phrase), false, phrase);
  }
  for (const phrase of ['5880 kWh', '40%', 'com 40%', 'comercial']) assert.equal(f.continuesEconomyCalculation(phrase), true, phrase);
});

test('UC explícita substitui o cliente anterior sem ampliar o acesso à usina', async () => {
  const f = fixture(); const question = 'Abra a fatura da Cemig da UC final 1899';
  const reply = await f.executeAssistantTool(f.detectCapability(question), f.ctx, question);
  assert.deepEqual(reply.documents.map(doc => doc.id), ['f2']);
  const invoiceCall = f.calls.find(([name]) => name === 'listarFaturas');
  assert.deepEqual(invoiceCall[1], [undefined, undefined, 'p1']);
});

test('PDF → fim da conversa → histórico recarregado → consumo da mesma UC', async () => {
  const f = fixture(); const scope = 'user-test:gerador:p1';
  const question = 'Abra a fatura da Cemig da UC final 1898';
  const opened = await f.executeAssistantTool(f.detectCapability(question), f.ctx, question);
  assert.equal((await f.resolveAssistantDocument(opened.documents[0])).url, 'https://example.com/cemig.pdf');
  const history = f.reloadHistory();
  history.saveChatHistory(scope, [{ from: 'user', text: question, private: true }, { from: 'assistant', text: opened.text, private: true }]);
  await history.loadChatHistory(scope); // Await the serialized secure-store write before a new session.
  const reopened = await f.reloadHistory().loadChatHistory(scope);
  const previous = reopened.filter(turn => turn.from === 'user').at(-1);
  const followup = f.inheritAssistantUnitTarget('Qual foi o consumo dessa UC?', previous.text);
  const reply = await f.executeAssistantTool(f.detectCapability(followup), { generator: true, plantId: 'p1' }, followup);
  assert.match(reply.text, /854652001898.*420 kWh/s);
  assert.equal((await f.reloadHistory().loadChatHistory('other-user:gerador:p1')).length, 0);
  assert.equal((await f.reloadHistory().loadChatHistory('user-test:gerador:p2')).length, 0);
});

test('Consumidor não consulta módulos de gestão, mesmo solicitados diretamente', async () => {
  const f = fixture();
  for (const module of ['cotas', 'carteira', 'equipe', 'atividade', 'operacao', 'inversores', 'assinatura', 'termos', 'comercial', 'clientes', 'usinas']) {
    const reply = await f.executeAssistantTool({ module, mode: 'query', review: false }, { ...f.ctx, generator: false }, module);
    assert.match(reply.text, /não está disponível/);
  }
  assert.equal(f.calls.length, 0);
});

test('sem usina ou permissão administrativa não busca dados fora do contexto', async () => {
  const f = fixture();
  for (const module of ['unidades', 'clientes', 'faturamento', 'conta-luz', 'contratos', 'operacao', 'inversores']) {
    const reply = await f.executeAssistantTool({ module, mode: 'query', review: false }, { generator: true }, module);
    assert.match(reply.text, /Selecione.*usina/);
  }
  for (const module of ['cotas', 'comercial']) {
    const reply = await f.executeAssistantTool({ module, mode: 'query', review: false }, { ...f.ctx, role: 'COLABORADOR' }, module);
    assert.match(reply.text, /administrador/);
  }
  assert.equal(f.calls.length, 0);
});

test('Cliente consulta perfil pelo ambiente Consumidor', async () => {
  const f=fixture(); const ctx={...f.ctx,generator:false,plantId:undefined};
  const reply=await f.queryLiveAccount('meus dados',ctx);
  assert.match(reply.text,/teste@example.com/);
  assert.deepEqual(f.calls.find(([name])=>name==='me')[1],['CONSUMIDOR']);
});

test('Cliente consulta economia somente da UC própria selecionada', async () => {
  const f=fixture(); const ctx={...f.ctx,generator:false,plantId:undefined};
  const reply=await f.queryLiveAccount('qual minha economia',ctx);
  assert.match(reply.text,/854652001898.*800,00/s);
  assert.deepEqual(f.calls.find(([name])=>name==='buscarDashboard')[1],['c1','854652001898']);
  assert.equal(f.calls.some(([name])=>name==='listarUnidadesGestor'),false);
});

test('Cliente sem UC própria selecionada não consulta dashboard de outro contexto', async () => {
  const f=fixture();
  const reply=await f.queryLiveAccount('qual minha economia',{generator:false,unitId:'nao-autorizada'});
  assert.match(reply.text,/Selecione uma das suas UCs/);
  assert.equal(f.calls.some(([name])=>name==='buscarDashboard'),false);
});

test('Cliente distingue consumo médio cadastrado do último consumo da fatura', async () => {
  const f=fixture(); const ctx={...f.ctx,generator:false,plantId:undefined};
  assert.match((await f.queryLiveAccount('qual o consumo médio da minha UC',ctx)).text,/431 kWh/);
  assert.match((await f.queryLiveAccount('qual foi o consumo da UC final 1898',ctx)).text,/420 kWh/);
  const invoiceCall=f.calls.find(([name])=>name==='listarFaturas');
  assert.deepEqual(invoiceCall[1],['c1','854652001898',undefined]);
});

test('Cliente abre contrato da UC selecionada sem consultar contratos da empresa', async () => {
  const f=fixture(); const ctx={...f.ctx,generator:false,plantId:undefined};
  const reply=await f.queryLiveAccount('abra o PDF do meu contrato',ctx);
  assert.deepEqual(reply.documents.map(doc=>[doc.kind,doc.id]),[['contrato','u1']]);
  assert.equal((await f.resolveAssistantDocument(reply.documents[0])).url,'https://example.com/contrato.pdf');
  assert.equal(f.calls.some(([name])=>name==='listarContratosDaEmpresa'),false);
});

test('Pedido simples de abrir meu contrato consulta o documento da UC atual', async () => {
  const f=fixture(); const ctx={...f.ctx,generator:false,plantId:undefined};
  const reply=await f.queryLiveAccount('abra meu contrato',ctx);
  assert.deepEqual(reply.documents.map(doc=>[doc.kind,doc.id]),[['contrato','u1']]);
  assert.equal(f.calls.some(([name])=>name==='listarContratosDaEmpresa'),false);
});

test('Cliente consulta autoleituras pelo serviço próprio e não inventa protocolo', async () => {
  const f=fixture(); const ctx={...f.ctx,generator:false,plantId:undefined};
  const reply=await f.queryLiveAccount('consulte histórico de leituras da UC final 1898',ctx);
  assert.match(reply.text,/Não há leituras recebidas/);
  assert.deepEqual(f.calls.find(([name])=>name==='listarMinhasAutoleituras')[1],['u1']);
  assert.equal(f.calls.some(([name])=>name==='listarAutoleituras'),false);
});

test('Cliente consulta privacidade sem emitir solicitação ou apagar dados', async () => {
  const f=fixture(); const ctx={...f.ctx,generator:false,plantId:undefined};
  const reply=await f.queryLiveAccount('consulte pedidos de privacidade',ctx);
  assert.match(reply.text,/ACESSO/);
  assert.equal(f.calls.some(([name])=>name==='post'),false);
});

for (const generator of [false, true]) test(`concessionaria da UC usa cadastro autenticado (gerador=${generator})`, async () => {
 const f=fixture(); f.unit.distribuidora='ENERGISA';
 const reply=await f.queryLiveAccount('De qual concessionaria e a UC?',{...f.ctx,generator});
 assert.match(reply.text,/UC 854652001898.*ENERGISA/);
 assert.doesNotMatch(reply.text,/CEMIG/);
 assert.equal(f.calls.some(([name])=>name==='listarFaturas'),false);
 assert.equal(f.calls.some(([name])=>name===(generator?'listarUnidadesGestor':'listarMinhasUnidades')),true);
});
test('concessionaria ausente nao presume Cemig e UC explicita alheia nao usa contexto',async()=>{
 const f=fixture();
 assert.match((await f.queryLiveAccount('Qual a distribuidora da minha UC?',{...f.ctx,generator:false})).text,/não está informada/);
 assert.match((await f.queryLiveAccount('Qual concessionaria da UC 999999999999?',f.ctx)).text,/Não encontrei/);
 assert.equal(f.detectCapability('abra a fatura da concessionaria da UC final 1898').module,'conta-luz');
 assert.equal(f.detectCapability('altere a distribuidora da UC').review,true);
});
test('acompanhamento da concessionaria preserva a UC anteriormente consultada',()=>{
 const f=fixture();
 assert.equal(f.inheritAssistantUnitTarget('e a concessionaria?','consumo da UC final 1898'),'e a concessionaria da UC 1898');
});

