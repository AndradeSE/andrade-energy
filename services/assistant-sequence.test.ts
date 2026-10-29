import test from 'node:test';import assert from 'node:assert/strict';
import {executeSolarSequence} from './assistant-sequence';
import {registerSolarControl} from './assistant-controls';
const context={generator:true,role:'GESTOR',plantId:'usina'};
test('navega e preenche na nova tela; não salva sem comando explícito',async()=>{
 let route='',value='',clicks=0;
 const off=registerSolarControl({id:'seq-field',label:'Nome',scope:'conta',kind:'field',active:()=>route==='/clientes/novo',invoke:v=>{value=v!;}});
 try{
 const result=await executeSolarSequence('abra novo cliente depois preencha o campo Nome com Maria',{context,scope:'conta',current:()=>true,navigate:r=>{route=r;},routeReady:r=>route===r,control:async()=>{value='Maria';return 'Preenchi o campo Nome';}});
 assert.match(result!,/Concluí 2/);assert.equal(value,'Maria');assert.equal(clicks,0);
 }finally{off();}
});
test('plano inteiro é validado antes da primeira ação; respeita permissões',async()=>{
 let calls=0;const io={context:{...context,generator:false,role:'LEITURA'},scope:'conta',current:()=>true,navigate:()=>{calls++;},routeReady:()=>true,control:async()=>{calls++;return 'Acionei';},pause:async()=>{}};
 assert.match((await executeSolarSequence('abra economia depois abra financeiro',io))!,/não corresponde/);assert.equal(calls,0);
 assert.match((await executeSolarSequence('abra economia depois envie dinheiro para fora',io))!,/não corresponde/);assert.equal(calls,0);
});
test('para com controle ausente, cancelamento ou mudança de conta; não repete botão',async()=>{
 let calls=0;const io={context,scope:'conta',current:()=>true,navigate:()=>{calls++;},routeReady:()=>true,control:async()=>{calls++;return 'Ação cancelada.';},pause:async()=>{}};
 assert.match((await executeSolarSequence('abra clientes depois clique no botão Excluir',io))!,/não está disponível/);assert.equal(calls,1);
 const off=registerSolarControl({id:'seq-btn',label:'Salvar',scope:'conta',kind:'button',active:()=>true,invoke:()=>{}});
 try{assert.match((await executeSolarSequence('abra clientes depois clique no botão Salvar',io))!,/cancelada/);assert.equal(calls,3);
 assert.match((await executeSolarSequence('abra clientes depois clique no botão Salvar',{...io,current:()=>false}))!,/ambiente mudou/);assert.equal(calls,3);}finally{off();}
});
