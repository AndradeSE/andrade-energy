import assert from "node:assert/strict";
import test from "node:test";
import { supabase } from "../../config/supabase";
import { propostaDaUnidadeController } from "./contratos.controller";

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
