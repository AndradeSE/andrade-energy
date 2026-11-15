import assert from "node:assert/strict";
import { test } from "node:test";
import { accountIntent, answerAccountQuestion } from "../src/assistantAccountWeb.ts";
import { consumerEnergySummary } from "../src/consumerEnergySummary.ts";
import { inheritWebUnit } from "../src/assistantContextWeb.ts";

test("consumo médio usa cadastro próprio, não o dashboard nem a última fatura", async () => {
  const paths:string[]=[];
  const result=await answerAccountQuestion("qual o consumo médio da UC final 1898", {variant:"CONSUMIDOR",unit:{id:"u1"},allowedSections:["Minha unidade"]},async path=>{paths.push(path);return [{id:"u1",numero:"854652001898",consumo_medio_kwh:431}];});
  assert.deepEqual(paths,["/clientes/minhas-unidades"]); assert.match(result!.text,/431 kWh/); assert.match(result!.text,/não é o consumo da última/);
});

test("média ausente não vira zero e final ambíguo não escolhe unidade", async () => {
  const ctx={variant:"CONSUMIDOR" as const,unit:{id:"u1"}};
  const missing=await answerAccountQuestion("consumo médio",ctx,async()=>[{id:"u1",numero:"123",consumo_medio_kwh:null}]);
  assert.match(missing!.text,/não informado/); assert.doesNotMatch(missing!.text,/0 kWh/);
  const ambiguous=await answerAccountQuestion("consumo médio da UC final 123",ctx,async()=>[{id:"u1",numero:"111123"},{id:"u2",numero:"222123"}]);
  assert.match(ambiguous!.text,/mais de uma UC/);
});

test("histórico de autoleitura usa somente endpoint da UC própria", async () => {
  const paths:string[]=[];
  const reply=await answerAccountQuestion("histórico de autoleituras",{variant:"CONSUMIDOR",unit:{id:"owned/id"}},async path=>{paths.push(path);return path==="/clientes/minhas-unidades"?[{id:"owned/id",numero:"123"}]:[{estado:"RECEBIDA",leitura_kwh:1234}];});
  assert.deepEqual(paths,["/clientes/minhas-unidades","/clientes/minhas-unidades/owned%2Fid/autoleitura"]);
  assert.match(reply!.text,/RECEBIDA/);assert.match(reply!.text,/não significa protocolo confirmado/);
});

test("consumo retoma UC mencionada sem consultar alvo fora do acesso", async () => {
  const history=[{role:"model",text:"UC 854652001898 · 431 kWh"}];
  const question=inheritWebUnit("Qual foi o consumo dessa UC?",history);
  assert.match(question,/UC 854652001898/);
  const paths:string[]=[];
  const ctx={variant:"CONSUMIDOR" as const,unit:{id:"other",numero:"999"},clientId:"c1"};
  const reply=await answerAccountQuestion(question,ctx,async path=>{paths.push(path);return path==="/clientes/minhas-unidades"?[{id:"u1",numero:"854652001898",cliente_id:"c1"}]:{consumo:420};});
  assert.deepEqual(paths,["/clientes/minhas-unidades","/dashboard/cliente?clienteId=c1&uc=854652001898"]);assert.match(reply!.text,/420 kWh/);
  const denied=await answerAccountQuestion("consumo da UC 777",ctx,async path=>{assert.equal(path,"/clientes/minhas-unidades");return [];});
  assert.match(denied!.text,/UC autorizada/);
});

test("memória de UC ambígua e nova UC explícita não são substituídas", () => {
  assert.equal(inheritWebUnit("consumo dessa UC",[{role:"model",text:"UC 123 e UC 456"}]),"consumo dessa UC");
  assert.equal(inheritWebUnit("consumo dessa UC final 456",[{role:"model",text:"UC 123"}]),"consumo dessa UC final 456");
});

test("Cliente não consulta empresas mesmo com lista de permissões inconsistente", async () => {
  const reply=await answerAccountQuestion("empresas",{variant:"CONSUMIDOR",allowedSections:["Empresas"]},async()=>{throw Error("não deve consultar");});
  assert.match(reply!.text,/limitado às suas UCs/);
});

test("perfil web inclui contatos e endereço no ambiente do Cliente",async()=>{
  const reply=await answerAccountQuestion("meu perfil",{variant:"CONSUMIDOR"},async path=>{assert.equal(path,"/auth/me?tipo=CONSUMIDOR");return {nome:"Teste",email:"teste@example.com",telefone:"31999999999",endereco:"Rua Exemplo"};});
  assert.match(reply!.text,/teste@example.com.*31999999999.*Rua Exemplo/s);
});
test("Solar consulta apenas a UC selecionada, sem mutação", async () => {
  const paths: string[] = [];
  const result = await answerAccountQuestion("Minhas faturas", { variant: "CONSUMIDOR", unit: { numero: "123", id: "owned" } }, async path => { paths.push(path); return [{ uc: "123", referencia: "OUT/2026", status: "ABERTA", valor_total: 100 }]; });
  assert.deepEqual(paths, ["/faturas?uc=123"]); assert.match(result!.text, /123/);
});
test("operações exigem revisão e não consultam nem alteram dados", async () => {
  const result = await answerAccountQuestion("Emita a fatura", { variant: "GERADOR" }, async () => { throw Error("Não deve chamar"); });
  assert.match(result!.text, /Nenhuma alteração/);
  assert.equal(accountIntent("emitir fatura"), "review");
  const review = await answerAccountQuestion("transferir dinheiro", { variant: "GERADOR" }, async () => { throw Error("Não deve chamar"); });
  assert.match(review!.text, /Nenhuma alteração/);
});
test("consumidor não consulta carteira ou clientes de outros acessos", async () => {
  const result = await answerAccountQuestion("meus clientes", { variant: "CONSUMIDOR" }, async () => { throw Error("Não deve consultar"); });
  assert.match(result!.text, /limitado às suas UCs/);
});
test("ajuda geral não é confundida com consulta de conta", () => {
  assert.equal(accountIntent("Como funciona o faturamento automático?"), null);
  assert.equal(accountIntent("Minha conexão Hotmail"), "email");
});
test("percentual usa energia compensada da competência, nunca o saldo acumulado", () => {
  assert.equal(consumerEnergySummary({ consumo: 300, creditos: 900, ultimaFatura: { energiaCompensada: 150, energiaInjetada: 500 } }).percentage, 50);
  assert.equal(consumerEnergySummary({ consumo: 300, ultimaFatura: { energiaCompensada: 300 } }).percentage, 100);
  assert.equal(consumerEnergySummary({ consumo: 0, creditos: 900 }).percentage, 0);
  assert.equal(consumerEnergySummary({ consumo: NaN, ultimaFatura: { energiaCompensada: Infinity } }).percentage, 0);
});
