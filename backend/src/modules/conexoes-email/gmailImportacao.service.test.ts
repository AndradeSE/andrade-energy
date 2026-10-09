import assert from "node:assert/strict";
import { test } from "node:test";
// Os testes injetam o banco e o OAuth; nenhum segredo ou serviço real é usado.
process.env.SUPABASE_URL = "https://gmail-tests.example.com";
process.env.SUPABASE_SERVICE_KEY = "gmail-test-placeholder";
const { enfileirarFaturasGmail } = require("./gmailImportacao.service") as typeof import("./gmailImportacao.service");

function cenario({ ativo = true, falha = false, duasEmpresas = false } = {}) {
  const conexoes = [
    { id: "c1", empresa_id: "e1", email_conectado: "caixa@example.com", unidade_consumidora_id: "uc1" },
    { id: "c2", empresa_id: duasEmpresas ? "e2" : "e1", email_conectado: "caixa@example.com", unidade_consumidora_id: "uc2" },
  ];
  const registros = new Map<string, any>();
  const atualizacoes: any[] = [];
  let consultas = 0;
  const db = { from(tabela: string) {
    let operacao = "select";
    let payload: any;
    const filtros: Record<string, any> = {};
    const consulta: any = {
      select() { return consulta; },
      eq(campo: string, valor: any) { filtros[campo] = valor; return consulta; },
      maybeSingle() { return consulta; },
      update(valor: any) { operacao = "update"; payload = valor; return consulta; },
      upsert(valor: any, opcoes: any) {
        assert.equal(opcoes.ignoreDuplicates, true);
        assert.equal(opcoes.onConflict, "provedor,provedor_email_id");
        operacao = "upsert"; payload = valor; return consulta;
      },
      then(resolve: any, reject: any) {
        return Promise.resolve().then(() => {
          if (operacao === "upsert") {
            if (!registros.has(payload.provedor_email_id)) registros.set(payload.provedor_email_id, payload);
          } else if (operacao === "update") atualizacoes.push(payload);
          return { error: null, data: operacao !== "select" ? null : tabela === "conexoes_email" ? conexoes : {
            id: filtros.id, tipo: "BENEFICIARIA", status: "ATIVA", recebimento_email_ativo: ativo,
            usinas: { titularidade_ucs_recebedoras: "GERADOR" },
          } };
        }).then(resolve, reject);
      },
    };
    return consulta;
  } };
  const deps: any = {
    db, obterToken: async () => { if (falha) throw new Error("token privado"); return "token"; },
    listar: async () => { consultas++; return [{ id: "m1" }]; },
    consultar: async () => ({ payload: {
      headers: [{ name: "From", value: "CEMIG <fatura@cemig.com.br>" }, { name: "Subject", value: "CEMIG FATURA ONLINE" }],
      parts: [{ partId: "1", filename: "conta.pdf", body: { attachmentId: "a1" } }],
    } }),
  };
  return { deps, registros, atualizacoes, consultas: () => consultas };
}

test("uma caixa atende duas UCs do gerador e repetição não duplica o recebimento", async () => {
  const c = cenario();
  await enfileirarFaturasGmail(c.deps);
  await enfileirarFaturasGmail(c.deps);
  assert.equal(c.consultas(), 2);
  assert.equal(c.registros.size, 1);
  const registro = [...c.registros.values()][0];
  assert.equal(registro.provedor, "GMAIL");
  assert.equal(registro.status, "PENDENTE");
  assert.equal(registro.payload.gmail.mensagemId, "m1");
  assert.equal(c.atualizacoes[0].regra_status, "ATIVA");
});

test("recebimento desativado impede leitura e criação de registros", async () => {
  const c = cenario({ ativo: false });
  await enfileirarFaturasGmail(c.deps);
  assert.equal(c.consultas(), 0);
  assert.equal(c.registros.size, 0);
});

test("mesma caixa em empresas distintas mantém registros separados", async () => {
  const c = cenario({ duasEmpresas: true });
  await enfileirarFaturasGmail(c.deps);
  assert.equal(c.consultas(), 2);
  assert.equal(c.registros.size, 2);
  assert.deepEqual(new Set([...c.registros.values()].map(r => r.empresa_id)), new Set(["e1", "e2"]));
});

test("falha OAuth não marca automação ativa nem expõe segredos", async () => {
  const c = cenario({ falha: true });
  await enfileirarFaturasGmail(c.deps);
  assert.equal(c.registros.size, 0);
  assert.ok(c.atualizacoes.every(a => a.regra_status === "ERRO"));
  assert.doesNotMatch(JSON.stringify(c.atualizacoes), /token privado/);
});
