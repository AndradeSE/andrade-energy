import { strict as assert } from "node:assert";
import { test } from "node:test";
import { answerInConversation, answerLocally, asksLatestInvoiceAmount } from "./local-assistant";
import { latestInvoiceAmountReply } from "./local-assistant-invoices";
import { detectFinancialMetric, financialMetricReply } from "./assistant-financial";
const generator = { variant: "gerador", authenticated: true } as const;
test("only recognized navigation commands produce routes", () => assert.equal(answerLocally("Abra faturamento", generator).route, "/faturamento"));
test("consumer cannot navigate to generator billing", () => assert.equal(answerLocally("Abra faturamento", { ...generator, variant: "consumidor" }).route, undefined));
test("sensitive commands never produce an action", () => assert.equal(answerLocally("transferir dinheiro", generator).kind, "blocked"));
test("questions about sensitive features are explained instead of blocked", () => {
  assert.equal(answerLocally("Como gerar uma fatura?", generator).kind, "help");
  assert.equal(answerLocally("Como pagar uma fatura?", generator).kind, "help");
  assert.equal(answerLocally("Pode pagar minha fatura?", generator).kind, "blocked");
});
test("unauthenticated requests are blocked", () => assert.equal(answerLocally("abrir perfil", { ...generator, authenticated: false }).kind, "blocked"));
test("unknown request does not invent private data", () => assert.equal(answerLocally("qual e meu saldo", generator).kind, "unknown"));
test("generator knows the two distinct automatic billing flows", () => {
  assert.match(answerLocally("Como funciona a fatura automática da usina?", generator).text, /sem criar cobrança/);
  assert.match(answerLocally("Onde configuro faturamento automático das UCs?", generator).text, /Faturamento/);
});
test("guide covers registration and financial safety without executing actions", () => {
  assert.match(answerLocally("Como cadastrar uma usina?", generator).text, /Manual ou Via fatura/);
  assert.match(answerLocally("Como cadastrar cliente?", generator).text, /vincule a UC/);
  assert.match(answerLocally("Como salvar chave Pix?", generator).text, /não as executo/);
});
test("financial values are selected from an authenticated summary, not generated", () => {
  assert.equal(detectFinancialMetric("Qual é o valor em aberto?"), "valorEmAberto");
  assert.equal(detectFinancialMetric("Quanto recebi?"), "receitaRecebida");
  assert.match(financialMetricReply({ receitaPrevista: 500, receitaRecebida: 200, valorEmAberto: 300, totalFaturas: 2, inadimplentes: 0, ticketMedio: 100, percentualRecebido: 40, historicoMensal: [] }, "valorEmAberto"), /R\$\s?300,00/);
});
test("latest invoice amount uses a live-data intent, not generative text", () => {
  assert.equal(asksLatestInvoiceAmount("Qual o valor da última fatura gerada?"), true);
  assert.equal(asksLatestInvoiceAmount("Como emitir uma fatura?"), false);
  assert.match(latestInvoiceAmountReply([
    { id: "old", created_at: "2026-09-01", referencia: "2026-09", status: "ABERTA", valor_total_unificado: 120 },
    { id: "draft", created_at: "2026-10-05", referencia: "2026-10", status: "RASCUNHO", valor_total_unificado: 900 },
    { id: "new", created_at: "2026-10-01", referencia: "2026-10", status: "ABERTA", valor_total_unificado: 387.44 },
  ]), /R\$\s?387,44.*10\/2026/);
});
test("follow-up keeps the previous topic without exposing a sensitive action", () => {
  const initial = answerInConversation("Onde vejo minhas faturas?", generator);
  assert.equal(initial.topic, "faturas");
  assert.equal(answerInConversation("E como faço?", generator, initial.topic).reply.kind, "help");
  assert.equal(answerInConversation("E pagar agora?", generator, initial.topic).reply.kind, "blocked");
});
