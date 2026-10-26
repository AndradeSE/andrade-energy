import test from 'node:test';
import assert from 'node:assert/strict';
import type {Page} from 'playwright-core';
import {enviarLoginCemig,FalhaLoginCemig,VerificacaoCemigExpirada,mesmoUsuarioCemig,conferirUsuarioModalCemig,prepararUsuarioCemig} from './cemigLogin';

test('prepara usuário na tela inicial e abre modal sem preencher senha nem resolver CAPTCHA',async()=>{
 let modalAberto=false,usuario='';const eventos:string[]=[];
 const page={url:()=> 'https://atende.cemig.com.br/Login',
  locator:(s:string)=>{
   if(s==='#modalLoginComSenha:visible')return {count:async()=>modalAberto?1:0,waitFor:async()=>assert.ok(modalAberto)};
   if(s==='#frmLogin #acesso:visible')return {waitFor:async()=>{},count:async()=>1,inputValue:async()=>usuario,fill:async(v:string)=>{usuario=v;eventos.push('usuario');}};
   if(s==='#modalLoginComSenha:visible #acessoModalSenhaValor:visible')return {count:async()=>1,inputValue:async()=>usuario};
   assert.fail(`Seletor não autorizado: ${s}`);
  },getByRole:(_role:string,{name}:{name:string})=>{assert.equal(name,'Entrar com senha');return {filter:()=>({count:async()=>1,click:async()=>{modalAberto=true;eventos.push('abrir-modal');}})};},
 } as unknown as Page;
 await prepararUsuarioCemig(page,'teste@exemplo.invalid',async()=>true);
 assert.deepEqual(eventos,['usuario','abrir-modal']);
 await prepararUsuarioCemig(page,'teste@exemplo.invalid',async()=>true);
 assert.deepEqual(eventos,['usuario','abrir-modal']);
 await assert.rejects(prepararUsuarioCemig(page,'outra@exemplo.invalid',async()=>true),FalhaLoginCemig);
});

test('confere identidade antes do CAPTCHA sem confundir CPF com e-mail',async()=>{
 assert.equal(mesmoUsuarioCemig('123.456.789-01','12345678901'),true);
 assert.equal(mesmoUsuarioCemig(' Teste@Exemplo.invalid ','teste@exemplo.invalid'),true);
 assert.equal(mesmoUsuarioCemig('12345678901','outra@exemplo.invalid'),false);
 for(const valor of ['teste@exemplo.invalid','outra@exemplo.invalid']){
  const page={url:()=> 'https://atende.cemig.com.br/Login',locator:()=>({count:async()=>1,inputValue:async()=>valor})} as unknown as Page;
  if(valor==='teste@exemplo.invalid')await conferirUsuarioModalCemig(page,valor);
  else await assert.rejects(conferirUsuarioModalCemig(page,'teste@exemplo.invalid'),FalhaLoginCemig);
 }
});

function formulario(opcoes:{visiveis?:number;formularios?:number;falha?:'usuario'|'senha'|'envio';token?:string;expirou?:boolean;url?:string}={}){
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
  locator:(selector:string):any=>selector==='#modalLoginComSenha:visible'?{count:async()=>0}:selector==='form'?{filter:()=>({count:async()=>opcoes.formularios??0,getByLabel:()=>({...campo('usuario'),filter:()=>({...campo('usuario'),count:async()=>1})}),locator:()=>campo('senha'),getByRole:()=>({...campo('botao'),filter:()=>({...campo('botao'),count:async()=>1})})})}:campo(selector.startsWith('textarea')?'token':'senha'),
 } as unknown as Page;
 return {page,eventos};
}
const acesso={login:'teste@exemplo.invalid',senha:'somente-teste'};

test('modal oficial usa usuário desabilitado sem rótulo e não tenta preenchê-lo',async()=>{
 for(const usuarioCorreto of [true,false]){
  const f=formulario();const locatorOriginal=f.page.locator.bind(f.page);
  f.page.locator=((selector:string)=>selector==='#modalLoginComSenha:visible'?{
   count:async()=>1,locator:(s:string)=>({
    count:async()=>1,
    inputValue:async()=>s.includes('acessoModal')?(usuarioCorreto?acesso.login:'outra-conta'):'',
    fill:async()=>{assert.ok(s.includes('senhaModal'),'não alterar usuário desabilitado');f.eventos.push('senha');},
    click:async()=>{assert.ok(s.includes('btnConfirmar'));f.eventos.push('envio');},
   }),
  }:locatorOriginal(selector)) as any;
  if(usuarioCorreto){await enviarLoginCemig(f.page,acesso,async()=>true);assert.deepEqual(f.eventos,['senha','envio']);}
  else {await assert.rejects(enviarLoginCemig(f.page,acesso,async()=>true),/preencher o usuário/);assert.deepEqual(f.eventos,[]);}
 }
});

test('ignora o usuário oculto da tela inicial e envia uma única vez',async()=>{
 const f=formulario();await enviarLoginCemig(f.page,acesso,async()=>true);
 assert.deepEqual(f.eventos,['usuario','senha','envio']);
});
test('não escolhe arbitrariamente quando há dois formulários visíveis',async()=>{
 const f=formulario({visiveis:2});
 await assert.rejects(enviarLoginCemig(f.page,acesso,async()=>true),/formulários 0, usuário 2, senha 1, entrar 2/);
 assert.deepEqual(f.eventos,[]);
});
test('usa somente o formulário de senha mesmo com usuário duplicado na landing page',async()=>{
 const f=formulario({visiveis:2,formularios:1});
 await enviarLoginCemig(f.page,acesso,async()=>true);
 assert.deepEqual(f.eventos,['usuario','senha','envio']);
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
