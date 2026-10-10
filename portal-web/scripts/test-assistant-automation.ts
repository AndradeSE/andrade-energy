import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAutomationCommand, prepareAutomation, createAutomationExecutor, type AutomationContext, type AutomationDraft } from "../src/assistantAutomation.ts";
const consumer: AutomationContext = {variant:"CONSUMIDOR",scope:"consumer:owned",allowedSections:["Perfil","Minha unidade"]};
const generator: AutomationContext = {variant:"GERADOR",scope:"generator:plant",plantId:"plant",allowedSections:["Clientes","Usinas","Perfil"]};
test("comandos mantêm valor literal e não aceitam campos financeiros, CPF ou endpoints", () => {
  assert.deepEqual(parseAutomationCommand("renomeie UC 123 para Casa São João"), {entity:"unit",field:"apelido",target:"123",value:"Casa São João"});
  assert.deepEqual(parseAutomationCommand("altere o email do cliente João Silva para Joao@example.com"), {entity:"client",field:"email",target:"João Silva",value:"Joao@example.com"});
  for (const text of ["altere o CPF do cliente João Silva para 123", "emita fatura de 17000", "execute /admin", "altere o valor do contrato para 100"]) assert.equal(parseAutomationCommand(text), null);
});
test("preparar apenas consulta; salvar requer execução distinta e preserva perfil", async () => {
  const reads: string[] = []; const writes: unknown[] = [];
  const profile = {id:"user",nome:"João Silva",email:"joao@example.com",telefone:"31988888888"};
  const io = {get:async (path:string)=>{reads.push(path);return profile},change:async(path:string,method:string,body:object)=>{writes.push({path,method,body}); return {...profile,...body}}};
  const draft = await prepareAutomation(parseAutomationCommand("altere o telefone do meu perfil para 31999999999")!,consumer,io,100);
  assert.equal(writes.length,0);
  await createAutomationExecutor()(draft,consumer,io,101);
  assert.deepEqual(writes,[{path:"/auth/me",method:"PUT",body:{nome:"João Silva",email:"joao@example.com",telefone:"31999999999",tipo:"CONSUMIDOR"}}]);
  assert.deepEqual(reads,["/auth/me?tipo=CONSUMIDOR","/auth/me?tipo=CONSUMIDOR"]);
});
test("cliques simultâneos enviam no máximo uma alteração", async () => {
  let writes=0;
  const unit={id:"owned",numero:"123",apelido:"Antes"};
  const io={get:async()=>[unit],change:async()=>{writes++;return {...unit,apelido:"Casa"}}};
  const draft=await prepareAutomation(parseAutomationCommand("renomeie UC 123 para Casa")!,consumer,io);
  const execute=createAutomationExecutor();
  const results=await Promise.allSettled([execute(draft,consumer,io),execute(draft,consumer,io)]);
  assert.equal(writes,1);assert.equal(results.filter(result=>result.status==="fulfilled").length,1);
});
test("ambiente, prazo, permissão e versão divergentes bloqueiam escrita", async () => {
  let writes=0;let current={id:"owned",numero:"123",apelido:"Antes"};
  const io={get:async()=>[current],change:async()=>{writes++;return current}};
  const draft=await prepareAutomation(parseAutomationCommand("renomeie UC 123 para Casa")!,consumer,io,100);
  await assert.rejects(createAutomationExecutor()(draft,{...consumer,scope:"other"},io,101),/ambiente/);
  await assert.rejects(createAutomationExecutor()(draft,consumer,io,300101),/expirou/);
  await assert.rejects(createAutomationExecutor()(draft,{...consumer,allowedSections:[]},io,101),/acesso/);
  current={...current,apelido:"Editado em outra tela"};
  await assert.rejects(createAutomationExecutor()(draft,consumer,io,101),/mudou/);
  assert.equal(writes,0);
});
test("cadastro ambíguo ou fora da própria lista nunca chega à escrita", async () => {
  const command=parseAutomationCommand("altere o email do cliente João Silva para novo@example.com")!;
  const io={get:async()=>[{id:"a",nome:"João Silva"},{id:"b",nome:"João Silva"}],change:async()=>{throw Error("não deve escrever")}};
  await assert.rejects(prepareAutomation(command,generator,io),/único cadastro/);
  await assert.rejects(prepareAutomation(command,consumer,io),/acesso/);
  await assert.rejects(prepareAutomation({...command,target:"Outra pessoa"},generator,{...io,get:async()=>[]}),/único cadastro/);
});
test("nome da usina é patch sem campos de CPF, UC ou faturamento", async () => {
  const plant={id:"plant",nome:"Usina antiga",cpf_titular:"não enviar",numero_instalacao:"123",tipo_gd:"GD2"};
  const writes: unknown[]=[];
  const io={get:async(path:string)=>path==="/usinas"?[plant]:plant,change:async(path:string,method:string,body:object)=>{writes.push({path,method,body});return {...plant,...body}}};
  const draft=await prepareAutomation(parseAutomationCommand("renomeie usina Usina antiga para Usina nova")!,generator,io);
  await createAutomationExecutor()(draft,generator,io);
  assert.deepEqual(writes,[{path:"/usinas/plant",method:"PUT",body:{nome:"Usina nova"}}]);
});
test("resposta perdida impede reenvio da mesma revisão e não confirma sucesso", async () => {
  let writes=0;const unit={id:"owned",numero:"123",apelido:"Antes"};
  const io={get:async()=>[unit],change:async()=>{writes++;throw Error("Resposta perdida; conferir cadastro")}};
  const draft=await prepareAutomation(parseAutomationCommand("renomeie UC 123 para Casa")!,consumer,io);
  const execute=createAutomationExecutor();
  await assert.rejects(execute(draft,consumer,io),/perdida/);
  await assert.rejects(execute(draft,consumer,io),/já foi enviada/);
  assert.equal(writes,1);
});
test("rascunho forjado, telefone inválido e resposta sem confirmação são recusados", async () => {
  const io={get:async()=>({id:"user",nome:"João Silva",email:"joao@example.com",telefone:"31988888888"}),change:async()=>({id:"outro"})};
  await assert.rejects(prepareAutomation(parseAutomationCommand("altere o telefone do meu perfil para abc")!,consumer,io),/telefone/);
  const draft=await prepareAutomation(parseAutomationCommand("altere o telefone do meu perfil para 31999999999")!,consumer,io);
  await assert.rejects(createAutomationExecutor()({...draft} as AutomationDraft,consumer,io),/revisão válida/);
  await assert.rejects(createAutomationExecutor()(draft,consumer,io),/não confirmou/);
});
test("troca de ambiente durante a consulta de confirmação impede a escrita", async () => {
  let current=true;let writes=0;
  const unit={id:"owned",numero:"123",apelido:"Antes"};
  const io={get:async()=>[unit],change:async()=>{writes++;return {...unit,apelido:"Casa"}},isCurrent:()=>current};
  const draft=await prepareAutomation(parseAutomationCommand("renomeie UC 123 para Casa")!,consumer,io);
  current=false;
  await assert.rejects(createAutomationExecutor()(draft,consumer,io),/ambiente mudou/);
  assert.equal(writes,0);
});
