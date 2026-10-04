import assert from "node:assert/strict";
import { test } from "node:test";
import { cpfValido, nomeCompletoValido, erroEndereco, lerEnderecoFatura, serializarEndereco } from "../../utils/cadastroCliente.ts";
import { detectPixKeyType } from "../../utils/detectPixKeyType.ts";

test("CPF checks digits, not just length", () => {
  assert.equal(cpfValido("11111111111"), false);
  assert.equal(cpfValido("529.982.247-25"), true);
  assert.equal(cpfValido("529.982.247-26"), false);
});
test("Names require a surname and allow accents", () => {
  assert.equal(nomeCompletoValido("Vinícius Duarte"), true);
  assert.equal(nomeCompletoValido("Vinícius"), false);
  assert.equal(nomeCompletoValido("Teste 123"), false);
});
test("Structured address survives the existing API text format", () => {
  const address = { cep: "37500-234", logradouro: "Rua de Teste", numero: "S/N", complemento: "", bairro: "Centro", cidade: "Itajubá", uf: "MG" };
  assert.deepEqual(lerEnderecoFatura(serializarEndereco(address)), address);
  assert.equal(erroEndereco(address), "");
  assert.notEqual(erroEndereco({...address, numero:""}), "");
  assert.notEqual(erroEndereco({...address, uf:"XX"}), "");
});
test("Legacy invoice addresses remain available for manual review", () => {
  assert.equal(lerEnderecoFatura("Rua Antiga sem número").logradouro, "Rua Antiga sem número");
});
test("Pix identifies the same types as the Android apps", () => {
  assert.equal(detectPixKeyType("teste@example.com"), "EMAIL");
  assert.equal(detectPixKeyType("529.982.247-25"), "CPF");
  assert.equal(detectPixKeyType("+55 (35) 99999-9999"), "PHONE");
  assert.equal(detectPixKeyType(""), null);
});
