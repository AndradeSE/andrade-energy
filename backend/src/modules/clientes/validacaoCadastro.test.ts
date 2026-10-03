import assert from "node:assert/strict";
import test from "node:test";
import { validarCadastroCliente } from "./validacaoCadastro";
test("API bloqueia CPF/nome/endereço inválidos; atualização parcial preservada", () => {
  const dados = { nome: "João da Silva", cpf: "52998224725", email: "joao@example.com", endereco: "Logradouro: Praça da Sé\nNúmero: S/N\nBairro: Sé\nCidade: São Paulo\nUF: SP\nCEP: 01001-000" };
  assert.equal(validarCadastroCliente(dados), null);
  assert.ok(validarCadastroCliente({ ...dados, email: "" }));
  assert.ok(validarCadastroCliente({ ...dados, email: "joao" }));
  assert.ok(validarCadastroCliente({ ...dados, cpf: "00000000000" }));
  assert.ok(validarCadastroCliente({ ...dados, nome: "João" }));
  assert.ok(validarCadastroCliente({ ...dados, endereco: "Rua incompleta" }));
  assert.equal(validarCadastroCliente({ telefone: "" }, true), null);
});
