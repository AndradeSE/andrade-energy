const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ts = require("typescript");
const calls = [];
const fixture = (name, value) => async (...args) => { calls.push({ name, args }); return value; };
const mocks = {
  "./auth.service": { me: fixture("me", { nome: "Cliente fictício", email: "teste@example.test" }), listarMeusPedidosDePrivacidade: fixture("privacy", []) },
  "./dashboard.service": { buscarDashboard: fixture("dashboard", { economiaMes: 31, economiaAcumulada: 100, creditos: 12, ultimaFatura: { competencia: "2026-09" } }) },
  "./carteira.service": { carregarCarteira: fixture("wallet", { saldoDisponivel: 123, saldoPendente: 10, totalRecebido: 250, totalTransferido: 117, status: "ATIVA" }) },
  "./colaboradores.service": { listarColaboradores: fixture("team", { colaboradores: [{ nome: "Teste equipe", status: "ATIVO" }], convites: [] }), listarAuditoriaColaboradores: fixture("audit", []) },
  "./fechamentos.service": { listarFechamentos: fixture("closures", [{ usina_id: "ours", competencia: "2026-09", energia_gerada: 200 }, { usina_id: "other", energia_gerada: 99999 }]) },
  "./usinas.service": { buscarDashboardUsina: fixture("plant", { unidadeGeradora: { id: "generator-unit" } }), listarInversoresDaUsina: fixture("inverters", []) },
  "./empresas.service": { listarMinhasEmpresas: fixture("companies", []) },
  "./comercial.service": { obterMinhaAssinatura: fixture("subscription", { assinatura: { status: "ATIVA", valor_contratado: 20, plano: { nome: "Teste" } } }), obterTermosAssinatura: fixture("terms", { documentos: [] }), obterPainelComercial: fixture("commercial", { resumo: { total: 1 }, planos: [], assinaturas: [] }) },
  "./recebimento-faturas.service": { obterRecebimentoFaturas: fixture("receiving", { ativo: true, configurado: true, status: "AGUARDANDO" }) },
  "./conexoes-email.service": { listarConexoesEmail: fixture("email", [{ provedor: "GMAIL", status: "CONECTADO" }]) },
  "./faturas.service": { listarFaturas: fixture("invoices", [{ id: "invoice", referencia: "09/2026", pdf_cemig_url: "https://example.test/original.pdf", status: "ABERTA" }]), buscarFatura: fixture("invoice", { pdf_cemig_url: "https://example.test/fresh.pdf" }), obterRelatorioCalculoFatura: fixture("report", "https://example.test/report.pdf") },
  "./clientes.service": { listarClientes: fixture("clients", []), listarFaturasAnexadasCliente: fixture("attachments", [{ id: "attachment", nome: "Original", url: "https://example.test/attachment.pdf" }]), listarUnidadesGestor: fixture("units", [{ id: "unit", numero: "123" }]), listarMinhasUnidades: fixture("my-units", [{ id: "unit", numero: "123", cliente_id: "client" }]) },
  "./contratos.service": { buscarContratoDaUnidade: fixture("contract", { status: "VIGENTE", contrato_assinado_url: "https://example.test/contract.pdf" }), listarContratosDaEmpresa: fixture("contracts", []), baixarPropostaDaUnidade: fixture("proposal", "file:///proposal.pdf") },
};
const cache = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, "..", relative);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {}; cache.set(filename, exports);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(compiled, { exports, require: name => mocks[name] || load(path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(filename), `${name}.ts`))) });
  return exports;
}
(async () => {
  const { asksOverdueInvoices, overdueInvoiceReply, asksLatestInvoiceDocument, invoiceDocumentChoices } = load("services/local-assistant-invoices.ts");
  for (const phrase of ["baixe o arquivo do ultimo faturamento da usina", "abra a última fatura da usina", "mande o PDF da última cobrança"]) assert.equal(asksLatestInvoiceDocument(phrase), true);
  for (const phrase of ["gere uma fatura PDF", "crie uma fatura", "emita uma fatura PDF", "fature a usina"]) assert.equal(asksLatestInvoiceDocument(phrase, true), false);
  const latestDocument = invoiceDocumentChoices("baixe o arquivo do ultimo faturamento da usina", [
    { id: "old", status: "ABERTA", created_at: "2026-09-01", pdf_unificada_url: "https://example.test/old.pdf" },
    { id: "latest", status: "ABERTA", created_at: "2026-10-01", pdf_unificada_url: "https://example.test/latest.pdf" },
    { id: "draft", status: "RASCUNHO", created_at: "2026-10-06" },
  ]);
  assert.equal(latestDocument.length, 1);
  assert.equal(latestDocument[0].id, "latest");
  assert.equal(latestDocument[0].pdf_unificada_url, "https://example.test/latest.pdf");
  assert.equal(asksOverdueInvoices("tenho fatura atrasada?"), true);
  assert.equal(asksOverdueInvoices("tenho boletos vencidos?"), true);
  const late = overdueInvoiceReply([
    { id: "late", status: "ABERTA", vencimento: "2026-10-01", valor_total: 100 },
    { id: "today", status: "ABERTA", vencimento: "2026-10-06" },
    { id: "paid", status: "ABERTA", vencimento: "2026-10-01", cobrancas: [{ pago_em: "2026-10-02" }] },
    { id: "cancelled", status: "CANCELADA", vencimento: "2026-10-01" },
  ], "2026-10-06");
  assert.equal(late.invoices.length, 1);
  assert.equal(late.invoices[0].id, "late");
  const { detectCapability, displayNumber, ASSISTANT_MODULES } = load("services/assistant-capabilities.ts");
  const { executeAssistantTool, resolveAssistantDocument } = load("services/assistant-tools.ts");
  const { authorizedAccountSpeech } = load("backend/src/modules/assistente/account-speech.ts");
  assert.equal(ASSISTANT_MODULES.length, 25);
  assert.equal(detectCapability("Como cadastro clientes?"), undefined);
  assert.equal(detectCapability("excluir cliente").review, true);
  assert.equal(detectCapability("quero PDF da CEMIG").module, "conta-luz");
  assert.equal(detectCapability("envie o contrato").mode, "document");
  assert.equal(displayNumber(undefined, true), "não informado");
  assert.equal(displayNumber("123.50", true).replace(/\s/g, ""), "R$123,50");
  const consumer = { generator: false, role: "LEITURA", unitId: "unit", unitNumber: "123", clientId: "client" };
  const generator = { generator: true, role: "GESTOR", plantId: "ours", unitId: "unit" };
  assert.match((await executeAssistantTool(detectCapability("saldo da carteira"), consumer, "saldo da carteira")).text, /não está disponível/);
  assert.equal(calls.length, 0);
  assert.match((await executeAssistantTool(detectCapability("planos comercial"), generator, "planos comercial")).text, /administrador/);
  assert.equal(calls.length, 0);
  const mutation = await executeAssistantTool(detectCapability("cancelar contrato"), generator, "cancelar contrato");
  assert.equal(mutation.actions[0].review, true);
  assert.equal(calls.length, 0); // Nenhuma escrita nem consulta por comando destrutivo.
  assert.match((await executeAssistantTool(detectCapability("meu consumo e economia"), consumer, "meu consumo")).text, /31/);
  assert.match((await executeAssistantTool(detectCapability("minha equipe"), generator, "minha equipe")).text, /Teste equipe/);
  const operation = await executeAssistantTool(detectCapability("meus fechamentos"), generator, "meus fechamentos");
  assert.match(operation.text, /200/); assert.doesNotMatch(operation.text, /99999/);
  const receiving = await executeAssistantTool(detectCapability("recebimento automatico da usina"), generator, "recebimento automatico da usina");
  assert.equal(receiving.actions[0].params.unidadeId, "generator-unit");
  const contract = await executeAssistantTool(detectCapability("envie contrato PDF"), consumer, "envie contrato PDF");
  assert.equal(contract.documents[0].kind, "contrato");
  assert.equal((await resolveAssistantDocument(contract.documents[0])).url, "https://example.test/contract.pdf");
  const original = await executeAssistantTool(detectCapability("PDF da CEMIG setembro 2026"), consumer, "PDF da CEMIG setembro 2026");
  assert.equal(original.documents[0].kind, "conta-luz");
  assert.equal((await resolveAssistantDocument(original.documents[0])).url, "https://example.test/fresh.pdf");
  assert.equal(authorizedAccountSpeech({ speechText: "Valor R$ 123,50" }), undefined);
  assert.equal(authorizedAccountSpeech({ accountVoiceConsent: true, speechText: "Valor R$ 123,50" }), "Valor R$ 123,50");
  const speech = authorizedAccountSpeech({ accountVoiceConsent: true, speechText: "Nome Teste\nValor R$ 123,50 senha: abc token=xyz teste@example.test https://example.test/a.pdf" });
  assert.doesNotMatch(speech, /abc|xyz|example.test/);
  assert.match(speech, /123,50/);
  console.log("PASS: 25 módulos, intenções, escopo, permissões, ações sem escrita, economia, operação, recebimento, PDFs e consentimento da voz");
})().catch(error => { console.error(error); process.exitCode = 1; });
