import assert from "node:assert/strict";
import test from "node:test";
import {mascaraDocumento,mascaraMoeda,valorMoedaMascarada} from "./input-masks";
test("máscara progressiva de documento preserva zeros e não cria CPF oculto ao digitar quatro dígitos",()=>{
  assert.equal(mascaraDocumento("01234567890"),"012.345.678-90");
  assert.equal(mascaraDocumento("1234"),"123.4");
  assert.equal(mascaraDocumento("12345678000190"),"12.345.678/0001-90");
  assert.equal(mascaraDocumento(""),"");
});
test("moeda com milhar é convertida em valor exato sem perder casas nem multiplicar valor transferido",()=>{
  assert.equal(valorMoedaMascarada(mascaraMoeda("123456")),1234.56);
  assert.equal(valorMoedaMascarada(mascaraMoeda("R$ 1.234,56")),1234.56);
  assert.equal(valorMoedaMascarada(mascaraMoeda("1")),0.01);
  assert.equal(valorMoedaMascarada(""),0);
  assert.equal(mascaraMoeda(""),"");
  assert.ok(Number.isNaN(valorMoedaMascarada("123456789012345")));
});
