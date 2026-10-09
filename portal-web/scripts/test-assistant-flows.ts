import assert from "node:assert/strict";
import { test } from "node:test";
import { findSolarSelection, planSolarFlow } from "../src/assistantFlows.ts";
import { answerAccountQuestion } from "../src/assistantAccountWeb.ts";
test("Solar abre cada área permitida sem inventar rota", () => {
  for (const [question, section] of [["abrir perfil", "Perfil"], ["abrir contratos", "Contratos"], ["abrir contas de luz", "Contas de luz"], ["abrir carteira", "Carteira"], ["abrir meu plano", "Meu plano"], ["abrir minha marca", "Minha marca"], ["abrir empresas", "Empresas"], ["abrir geradores", "Geradores"], ["abrir colaboradores", "Colaboradores"], ["abrir gestão comercial", "Gestão comercial"], ["abrir clientes", "Clientes"], ["abrir usinas", "Usinas"], ["abrir operação", "Operação"], ["abrir tutoriais", "Tutoriais da web"], ["abrir aplicativos", "Aplicativos"], ["abrir configurações", "Configurações"], ["abrir economia", "Economia"], ["abrir home", "Visão geral"]]) {
    assert.equal(planSolarFlow(question, "GERADOR", [section])?.section, section);
    assert.equal(planSolarFlow(question, "GERADOR", []) , null);
  }
});
test("ações consequenciais abrem revisão; nunca produzem método HTTP de mutação", () => {
  assert.deepEqual(planSolarFlow("emita fatura manual", "GERADOR", ["Faturas"]), { section: "Faturas", mode: "manualBilling" });
  assert.deepEqual(planSolarFlow("crie cliente", "GERADOR", ["Clientes"]), { section: "Clientes", mode: "create" });
  assert.deepEqual(planSolarFlow("assine contrato", "CONSUMIDOR", ["Contratos"]), { section: "Contratos" });
  assert.equal(planSolarFlow("crie cliente", "CONSUMIDOR", ["Minha unidade"]), null);
  assert.equal(planSolarFlow("ative gmail", "GERADOR", []), null);
});
test("seleção exata exige uma única unidade da lista autorizada", () => {
  assert.deepEqual(planSolarFlow("selecione UC 123", "CONSUMIDOR", ["Minha unidade"]), { section: "Minha unidade", selection: { kind: "unit", value: "123" } });
  assert.equal(findSolarSelection([{id:"mine", numero:"123"}], "unit", "999"), null);
  assert.equal(findSolarSelection([{id:"a", numero:"123"},{id:"b", numero:"123"}], "unit", "123"), null);
  assert.equal(findSolarSelection([{id:"owned", nome:"São José"}], "plant", "sao jose"), "owned");
});
test("consulta respeita permissão antes de qualquer chamada", async () => {
  const result = await answerAccountQuestion("minhas faturas", { variant: "GERADOR", plantId:"plant", allowedSections:["Perfil"] }, async () => { throw Error("não deve chamar"); });
  assert.match(result!.text, /permissões/);
});
test("contrato consumidor e conta de luz usam a UC escolhida", async () => {
  const paths: string[] = [];
  const context = { variant: "CONSUMIDOR" as const, unit:{id:"owned/id", numero:"123"}, allowedSections:["Contratos", "Contas de luz"] };
  await answerAccountQuestion("meu contrato", context, async path => { paths.push(path); return {status:"AGUARDANDO"}; });
  await answerAccountQuestion("minhas contas de luz", context, async path => { paths.push(path); return []; });
  assert.deepEqual(paths, ["/contratos/unidade/owned%2Fid", "/faturas?categoria=concessionaria&uc=123"]);
});
test("usina ausente e resposta financeira nula não viram escopo global ou zero", async () => {
  const noPlant = await answerAccountQuestion("clientes", {variant:"GERADOR", allowedSections:["Clientes"]}, async () => { throw Error("não deve chamar"); });
  assert.match(noPlant!.text, /Selecione a usina/);
  const wallet = await answerAccountQuestion("carteira", {variant:"GERADOR", allowedSections:["Carteira"]}, async () => ({saldoDisponivel:null}));
  assert.match(wallet!.text, /não informado/); assert.doesNotMatch(wallet!.text, /0,00/);
});
