import test from "node:test";
import assert from "node:assert/strict";
import { extrairCadastroCemig } from "./cemig.cadastro.parser";
test("classificação comercial reconhece a atividade entre classe e modalidade", () => {
  assert.equal(extrairCadastroCemig("Comercial          Outros serviços          Convencional B3").classificacao, "Comercial Outros serviços Convencional B3");
  assert.equal(extrairCadastroCemig("Residencial Convencional B1").classificacao, "Residencial Convencional B1");
  assert.equal(extrairCadastroCemig("Comercial\nOutros serviços\nConvencional B3").classificacao, "");
});
