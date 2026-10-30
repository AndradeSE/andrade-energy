import assert from "node:assert/strict";
import test from "node:test";
import { operateSolarControl, registerSolarControl, parseControlCommand } from "./assistant-controls";
test("preenche somente o campo ativo, sem salvar ou transmitir o valor", async () => {
  let value = "";
  const off = registerSolarControl({ id: "nome", label: "Nome", scope: "conta-A", kind: "field", active: () => true, invoke: v => { value = v!; } });
  try {
    const result = await operateSolarControl("preencha o campo Nome com Maria Silva", "conta-A", async () => { throw Error("Sem botão"); }, () => true);
    assert.equal(value, "Maria Silva"); assert.match(result!, /Nenhum cadastro foi salvo/); assert.doesNotMatch(result!, /Maria Silva/);
    assert.match((await operateSolarControl("preencha Nome com Outra Pessoa", "conta-B", async () => true, () => true))!, /Não encontrei/); assert.equal(value, "Maria Silva");
  } finally { off(); }
});
test("botão exige confirmação e mudança de contexto ou tela invalida execução", async () => {
  let calls = 0, current = true;
  const off = registerSolarControl({ id: "salvar", label: "Salvar", scope: "conta", kind: "button", active: () => true, invoke: () => { calls++; } });
  try {
    await operateSolarControl("clique no botão Salvar", "conta", async () => false, () => true); assert.equal(calls, 0);
    await operateSolarControl("clique no botão Salvar", "conta", async () => { current = false; return true; }, () => current); assert.equal(calls, 0);
    await operateSolarControl("clique no botão Salvar", "conta", async () => true, () => true); assert.equal(calls, 1);
  } finally { off(); }
});
test("ambiguidade, campo secreto, controle desativado e alteração durante confirmação são bloqueados", async () => {
  let calls = 0;
  const offs = [
    registerSolarControl({ id: "email1", label: "Email", scope: "c", kind: "field", active: () => true, invoke: () => { calls++; } }),
    registerSolarControl({ id: "email2", label: "Email", scope: "c", kind: "field", active: () => true, invoke: () => { calls++; } }),
    registerSolarControl({ id: "senha", label: "Senha", scope: "c", kind: "field", active: () => true, invoke: () => { calls++; } }),
    registerSolarControl({ id: "inativo", label: "Excluir", scope: "c", kind: "button", active: () => false, invoke: () => { calls++; } }),
  ];
  try {
    assert.match((await operateSolarControl("digite Email com teste", "c", async () => true, () => true))!, /mais de um/);
    assert.match((await operateSolarControl("digite Senha com segredo", "c", async () => true, () => true))!, /pessoalmente/);
    assert.match((await operateSolarControl("aperte Excluir", "c", async () => true, () => true))!, /Não encontrei/);
    assert.equal(calls, 0);
    assert.deepEqual(parseControlCommand("insira Maria no campo Nome"), { kind: "field", label: "Nome", value: "Maria" });
  } finally { offs.forEach(off => off()); }
});
