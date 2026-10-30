import assert from "node:assert/strict";
import { test } from "node:test";
import { cpfTitularPatch } from "./cpfTitularPatch";

test("partial plant edits preserve the existing generation-unit holder document", () => {
  assert.deepEqual(cpfTitularPatch({ nome: "Usina de teste" }), {});
  assert.deepEqual(cpfTitularPatch(null), {});
  const current = { cpf_titular: "00000000000" };
  assert.deepEqual({ ...current, ...cpfTitularPatch({ nome: "Nome alterado" }) }, current);
});
test("an explicit holder-document edit remains supported in both API spellings", () => {
  assert.deepEqual(cpfTitularPatch({ cpf_titular: "000.000.000-00" }), { cpf_titular: "00000000000" });
  assert.deepEqual(cpfTitularPatch({ cpfTitular: "00.000.000/0000-00" }), { cpf_titular: "00000000000000" });
  assert.deepEqual(cpfTitularPatch({ cpf_titular: null }), { cpf_titular: null });
});
