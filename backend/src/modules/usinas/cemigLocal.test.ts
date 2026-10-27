import assert from 'node:assert/strict';
import test from 'node:test';
import type {Page} from 'playwright-core';
import {criarFluxoLocal,prepararRateioLocal,requisicaoLocalPermitida} from './cemigLocal';
import {AcaoManualCemig,FalhaEtapaCemig,validarAnexoCemig,confirmarModalidadeCemig} from './cemigCloud.portal';
import {CEMIG_PORTAL} from './cemigCloud.policy';
const uc='1121361801894';
const csv='1234567890123;00000000000;100;X\r\n';
const dados=prepararRateioLocal(`cemig-rateio-2026-10-${uc}.csv`,csv);
const page={url:()=>CEMIG_PORTAL} as Page;

test('seleciona modalidade no fluxo local e confirma valor, sem prosseguir se a escolha não persistir',async()=>{
 for(const persiste of [true,false]){
  let value='Selecione';let escolhas=0;
  const campo={waitFor:async()=>{},evaluate:async(fn:any)=>String(fn).includes("tagName")&&!String(fn).includes('selectedOptions')?true:value,
   selectOption:async(op:any)=>{assert.equal(op.label,'Autoconsumo remoto');escolhas++;if(persiste)value=op.label;}};
  const p={getByRole:()=>campo} as unknown as Page;
  if(persiste)await confirmarModalidadeCemig(p,true);
  else await assert.rejects(confirmarModalidadeCemig(p,true),FalhaEtapaCemig);
  assert.equal(escolhas,1);
 }
});

test('CSV local exige formato Cemig, soma exata e UC antes de abrir navegador',()=>{
 assert.equal(dados.uc,uc);
 assert.equal(prepararRateioLocal('cemig-teste.csv','\uFEFF'+csv,uc).csv,csv);
 for(const [nome,conteudo] of [['rascunho-rateio.csv',csv],['cemig-teste.csv',csv.replace('100','99')],['cemig-teste.csv','UC;CPF;PERCENTUAL;ANCORA']]){
  assert.throws(()=>prepararRateioLocal(nome,conteudo,uc));
 }
 assert.throws(()=>prepararRateioLocal('cemig-teste.csv',csv));
});
test('painel recusa outras origens, hosts e token mesmo com chave conhecida',()=>{
 const expected={origin:'http://127.0.0.1:12345',token:'local-test'};
 assert.equal(requisicaoLocalPermitida('127.0.0.1:12345',expected.origin,expected.token,expected),true);
 for(const [host,origin,token] of [['evil.test:12345',expected.origin,expected.token],['127.0.0.1:12345','https://evil.test',expected.token],['127.0.0.1:12345',expected.origin,'other'],['127.0.0.1:12345',undefined,expected.token]]){
  assert.equal(requisicaoLocalPermitida(host,origin,token,expected),false);
 }
});
test('clique duplo e repetição após revisão não repetem anexo',async()=>{
 let count=0;let finish!:()=>void;
 const pending=new Promise<void>(resolve=>finish=resolve);
 const fluxo=criarFluxoLocal(dados,async()=>{count++;await pending;return {estado:'REVISAO_SEM_PROTOCOLO',protocolo:null};});
 const first=fluxo.continuar([page],page);
 await fluxo.continuar([page],page);assert.equal(count,1);
 assert.equal(fluxo.status().estado,'EXECUTANDO');finish();await first;
 await fluxo.continuar([page],page);assert.equal(count,1);
 assert.equal(fluxo.status().estado,'REVISAO_SEM_PROTOCOLO');
});
test('login pendente permite continuar; falha de anexo trava para inspeção sem expor erro',async()=>{
 let calls=0;
 const fluxo=criarFluxoLocal(dados,async()=>{calls++;if(calls===1)throw new AcaoManualCemig('LOGIN');throw new FalhaEtapaCemig('ANEXO');});
 await fluxo.continuar([page],page);assert.equal(fluxo.status().estado,'AGUARDANDO_LOGIN');
 await fluxo.continuar([page],page);assert.equal(fluxo.status().estado,'INTERROMPIDO');
 await fluxo.continuar([page],page);assert.equal(calls,2);
 const privado=criarFluxoLocal(dados,async()=>{throw new Error('PRIVATE CPF PASSWORD');});
 await privado.continuar([page],page);assert.doesNotMatch(privado.status().mensagem,/PRIVATE|CPF|PASSWORD/);
});
test('fluxo compartilhado chega à revisão com a UC e o arquivo corretos sem protocolo',async()=>{
 const clicks:string[]=[];let upload:any;
 const locator=(name:string)=>({
  first(){return this;},isVisible:async()=>false,waitFor:async()=>{},
  click:async()=>{clicks.push(name);},evaluate:async()=> 'Autoconsumo remoto',inputValue:async()=>uc,
  setInputFiles:async(value:any)=>{upload=value;},
 });
 const options={first:()=>({isVisible:async()=>true,waitFor:async()=>{}}),count:async()=>1,nth:()=>({innerText:async()=>`Nº da unidade consumidora: ${uc}`,click:async()=>{clicks.push('UC');}})};
 const portal={url:()=>CEMIG_PORTAL,
  getByText:(name:any)=>locator(String(name)),
  getByRole:(role:string,opts?:any)=>role==='button'&&!opts?{filter:()=>options}:locator(String(opts?.name)),
  locator:(name:string)=>locator(name),
 } as unknown as Page;
 const result=await validarAnexoCemig(portal,uc,csv,dados.arquivo);
 assert.equal(result.estado,'REVISAO_SEM_PROTOCOLO');assert.equal(result.protocolo,null);
 assert.equal(upload.name,dados.arquivo);assert.equal(upload.buffer.toString(),csv);
 assert.deepEqual(clicks,['UC','Avançar','Avançar','Inserir por anexo','Avançar']);
 assert.ok(!clicks.some(c=>/Solicitar cadastro/.test(c)));
});
