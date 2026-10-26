import test from 'node:test';
import assert from 'node:assert/strict';
import type {Page} from 'playwright-core';
import {enviarLoginCemig,FalhaLoginCemig,VerificacaoCemigExpirada} from './cemigLogin';

function formulario(opcoes:{visiveis?:number;falha?:'usuario'|'senha'|'envio';token?:string;expirou?:boolean;url?:string}={}){
 const eventos:string[]=[];
 const campo=(nome:string)=>({
  count:async()=>nome==='usuario'?2:1,
  filter:({visible}:{visible:boolean})=>{assert.equal(visible,true);return {...campo(nome),count:async()=>opcoes.visiveis??1};},
  inputValue:async()=>nome==='token'?(opcoes.token??'t'.repeat(30)):'',
  fill:async()=>{eventos.push(nome);if(opcoes.falha===nome)throw new Error('segredo que não pode aparecer');},
  click:async()=>{eventos.push('envio');if(opcoes.falha==='envio')throw new Error('segredo que não pode aparecer');},
  first:()=>campo(nome),
 });
 const page={
  url:()=>opcoes.url??'https://atende.cemig.com.br/Login',frames:()=>[],
  getByText:(pattern:RegExp)=>({first:()=>({isVisible:async()=>!!opcoes.expirou&&pattern.test('Verificação expirou')})}),
  getByLabel:()=>campo('usuario'),getByRole:()=>campo('botao'),
  locator:(selector:string)=>campo(selector.startsWith('textarea')?'token':'senha'),
 } as unknown as Page;
 return {page,eventos};
}
const acesso={login:'teste@exemplo.invalid',senha:'somente-teste'};

test('ignora o usuário oculto da tela inicial e envia uma única vez',async()=>{
 const f=formulario();await enviarLoginCemig(f.page,acesso,async()=>true);
 assert.deepEqual(f.eventos,['usuario','senha','envio']);
});
test('não escolhe arbitrariamente quando há dois formulários visíveis',async()=>{
 const f=formulario({visiveis:2});
 await assert.rejects(enviarLoginCemig(f.page,acesso,async()=>true),/único formulário/);
 assert.deepEqual(f.eventos,[]);
});
test('não envia formulário com verificação expirada ou resposta ausente',async()=>{
 for(const opcoes of [{expirou:true},{token:''}]){
  const f=formulario(opcoes);await assert.rejects(enviarLoginCemig(f.page,acesso,async()=>true),VerificacaoCemigExpirada);
  assert.deepEqual(f.eventos,[]);
 }
});
test('não preenche acesso em origem externa ou sessão encerrada',async()=>{
 for(const externa of [false,true]){
  const f=formulario(externa?{url:'https://externo.invalid/Login'}:{});
  await assert.rejects(enviarLoginCemig(f.page,acesso,async()=>externa),FalhaLoginCemig);
  assert.deepEqual(f.eventos,[]);
 }
});
test('diagnóstico informa etapa sem revelar erros internos nem repetir envio',async()=>{
 for(const falha of ['usuario','senha','envio'] as const){
  const f=formulario({falha});
  await assert.rejects(enviarLoginCemig(f.page,acesso,async()=>true),(erro:unknown)=>{
   assert.ok(erro instanceof FalhaLoginCemig);assert.doesNotMatch(erro.message,/segredo|somente-teste|exemplo.invalid/);return true;
  });
  assert.ok(f.eventos.filter(e=>e==='envio').length<=1);
 }
});
