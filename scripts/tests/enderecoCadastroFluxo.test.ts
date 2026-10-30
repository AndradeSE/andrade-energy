import assert from "node:assert/strict";
import test from "node:test";

import { cpfValido, enderecoVazio, erroEndereco, lerEnderecoFatura, nomeCompletoValido, serializarEndereco } from "../../utils/cadastroCliente";
import { preencherModeloContrato, renderizarModeloContrato } from "../../backend/src/modules/contratos/modeloContrato";

test("fatura da usina preenche o que reconhece e permite completar o endereço", () => {
  const extraido = lerEnderecoFatura("RUA SOL NASCENTE, 42 - CENTRO 37500-000");
  assert.equal(extraido.cep, "37500-000");
  assert.equal(extraido.logradouro, "RUA SOL NASCENTE");
  assert.equal(extraido.numero, "42");
  assert.ok(erroEndereco(extraido), "cidade e UF não devem ser inventadas a partir do PDF");
  const revisado = { ...extraido, bairro: "Centro", cidade: "Cidade Exemplo", uf: "MG" };
  assert.equal(erroEndereco(revisado), "");
});

test("cliente fictício e usina fictícia aparecem como partes distintas na minuta e no PDF", async () => {
  const cliente = { ...enderecoVazio, cep: "37500-001", logradouro: "Rua do Cliente", numero: "10", bairro: "Centro", cidade: "Cidade Exemplo", uf: "MG" };
  const usina = { ...enderecoVazio, cep: "37500-002", logradouro: "Rua da Usina", numero: "42", bairro: "Industrial", cidade: "Cidade Exemplo", uf: "MG" };
  assert.equal(erroEndereco(cliente), "");
  assert.equal(erroEndereco(usina), "");
  const nomeDoCliente = "Cliente Fictício de Teste";
  const cpfDeTeste = "12345678909";
  assert.ok(nomeCompletoValido(nomeDoCliente));
  assert.ok(cpfValido(cpfDeTeste));
  const unidade = {
    numero: "00000000000", endereco: serializarEndereco(cliente), distribuidora: "CEMIG",
    desconto_percentual: 20, modalidade_faturamento: "INJECAO",
    clientes: { nome: nomeDoCliente, cpf: cpfDeTeste, endereco: serializarEndereco(cliente) },
    usinas: { nome: "Usina Fictícia de Teste", endereco: serializarEndereco(usina), tipo_gd: "GD1", potencia_kwp: 10, geracao_media: 1200 },
  };
  const contrato = {
    numero_contrato: "TESTE-000", desconto: 20,
    dados_documento: { locador_nome: "Usina Fictícia de Teste", locador_documento: "11111111000111", locador_endereco: serializarEndereco(usina), prazo_anos: 10, foro: "Cidade Exemplo/MG" },
  };
  const minuta = preencherModeloContrato(unidade, contrato);
  const partes = minuta.clausulas.map(c => c.text).join("\n");
  assert.match(partes, /LOCATÁRIO: Cliente Fictício de Teste/);
  assert.match(partes, /Rua do Cliente/);
  assert.match(partes, /Rua do Cliente, 10 - Centro - Cidade Exemplo\/MG - CEP 37500-001/);
  assert.match(partes, /LOCADOR: Usina Fictícia de Teste/);
  assert.match(partes, /Rua da Usina, 42 - Industrial - Cidade Exemplo\/MG - CEP 37500-002/);
  const pdf = await renderizarModeloContrato(unidade, contrato);
  assert.ok(pdf.length > 10_000);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
});
