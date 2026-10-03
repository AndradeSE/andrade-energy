import assert from "node:assert/strict";
import test from "node:test";
import { cpfValido, formatarCpf, nomeCompletoValido, erroEndereco, serializarEndereco, lerEndereco } from "../utils/cadastroCliente";
test("CPF, nome completo e endereço recuperável", () => {
  assert.equal(formatarCpf("52998224725"), "529.982.247-25");
  assert.equal(cpfValido("529.982.247-25"), true);
  for (const cpf of ["11111111111", "52998224724", "5299822472", "abc52998224725"]) assert.equal(cpfValido(cpf), false);
  assert.equal(nomeCompletoValido("João da Silva"), true);
  assert.equal(nomeCompletoValido("João"), false);
  const endereco = { cep: "01001-000", logradouro: "Praça da Sé", numero: "S/N", complemento: "Sala 2", bairro: "Sé", cidade: "São Paulo", uf: "SP" };
  assert.equal(erroEndereco(endereco), "");
  assert.deepEqual(lerEndereco(serializarEndereco(endereco)), endereco);
  assert.ok(erroEndereco({ ...endereco, uf: "XX" }));
});
