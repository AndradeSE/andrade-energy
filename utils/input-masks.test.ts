import assert from "node:assert/strict";
import test from "node:test";
import {mascaraDocumento,mascaraMoeda,valorMoedaMascarada,mascaraUcCemig} from "./input-masks";
test("UC atual mantém exatamente os dígitos de identificadores com 12 e 13 posições",()=>{
  for(const [raw,masked] of [["607081301889","6.070.813.018-89"],["1121361801894","11.213.618.018-94"]]){
    assert.equal(mascaraUcCemig(raw),masked);
    assert.equal(mascaraUcCemig(masked),masked);
    assert.equal(masked.replace(/\D/g,""),raw);
  }
  assert.equal(mascaraUcCemig("3006605532"),"3006605532");
  assert.equal(mascaraUcCemig(""),"");
});
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
