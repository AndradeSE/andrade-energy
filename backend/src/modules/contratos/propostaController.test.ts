import assert from "node:assert/strict";
import test from "node:test";
import { supabase } from "../../config/supabase";
import { propostaDaUnidadeController, dadosIniciaisContratoController } from "./contratos.controller";

test("consulta de proposta devolve erro ao app sem rejeição não tratada", async () => {
  const original = supabase.from;
  const mensagem = "Não foi possível preparar a proposta: falta tarifa cheia.";
  supabase.from = (() => { throw new Error(mensagem); }) as any;
  const resposta = { codigo: 200, corpo: null as any, status(codigo: number) { this.codigo = codigo; return this; }, json(corpo: any) { this.corpo = corpo; return this; } };
  try {
    await propostaDaUnidadeController({ params: { unidadeId: "teste" }, usuario: { empresa_id: "teste" } }, resposta);
    assert.equal(resposta.codigo, 400);
    assert.equal(resposta.corpo.message, mensagem);
  } finally {
    supabase.from = original;
  }
});

test("dados do gerador continuam disponíveis quando a proposta falha", async () => {
  const original = supabase.from;
  let unidades = 0;
  supabase.from = ((tabela: string) => {
    if (tabela === "clientes") throw new Error("Proposta sem tarifa cheia");
    const data = tabela === "empresas"
      ? { razao_social: "Gerador Fictício", documento: "12345678000199", endereco: "" }
      : ++unidades === 1
        ? { id: "uc-teste", cliente_id: "cliente-teste", usina_id: "usina-teste", usinas: { nome: "Usina teste", endereco: "Endereço da usina", titularidade_ucs_recebedoras: "GERADOR" } }
        : { titular: "Titular teste", cpf_titular: "12345678900", endereco: "Endereço cadastrado da geradora" };
    const consulta: any = { select() { return this; }, eq() { return this; }, single: async () => ({ data, error: null }), maybeSingle: async () => ({ data, error: null }) };
    return consulta;
  }) as any;
  const resposta = { codigo: 200, corpo: null as any, status(codigo: number) { this.codigo = codigo; return this; }, json(corpo: any) { this.corpo = corpo; return this; } };
  try {
    await dadosIniciaisContratoController({ params: { unidadeId: "uc-teste" }, usuario: { empresa_id: "empresa-teste" } }, resposta);
    assert.equal(resposta.codigo, 200);
    assert.equal(resposta.corpo.locador.nome, "Gerador Fictício");
    assert.equal(resposta.corpo.locador.documento, "12345678000199");
    assert.equal(resposta.corpo.locador.endereco, "Endereço cadastrado da geradora");
    assert.equal(resposta.corpo.proposta, null);
    assert.match(resposta.corpo.avisoProposta, /tarifa cheia/);
  } finally { supabase.from = original; }
});
