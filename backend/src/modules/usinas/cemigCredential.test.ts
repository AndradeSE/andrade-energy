import test from 'node:test';
import assert from 'node:assert/strict';
import {cifrarAcessoCemig,abrirAcessoCemig,validarAcessoCemig} from './cemigCredential.crypto';
import {enviarLoginCemig} from './cemigLogin';
import type {Page} from 'playwright-core';
const env={FINANCIAL_DATA_ENCRYPTION_KEY:'test-only-encryption-key'};
test('cofre usa cifra autenticada vinculada a empresa e usuário, com IV aleatório',()=>{
 const data={login:'test-user',senha:' test-password '};
 const a=cifrarAcessoCemig(data,'empresa-a','usuario-a',env),b=cifrarAcessoCemig(data,'empresa-a','usuario-a',env);
 assert.notEqual(a,b);assert.equal(a.includes(data.senha),false);assert.deepEqual(abrirAcessoCemig(a,'empresa-a','usuario-a',env),data);
 for(const [empresa,usuario] of [['empresa-b','usuario-a'],['empresa-a','usuario-b']])assert.throws(()=>abrirAcessoCemig(a,empresa,usuario,env));
 assert.throws(()=>abrirAcessoCemig(a,'empresa-a','usuario-a',{FINANCIAL_DATA_ENCRYPTION_KEY:'another-key'}));
 const fields=a.split('.');fields[2]=Buffer.alloc(16).toString('base64');assert.throws(()=>abrirAcessoCemig(fields.join('.'),'empresa-a','usuario-a',env));
 assert.throws(()=>cifrarAcessoCemig(data,'a','b',{}));
});
test('validação preserva espaços da senha e rejeita limites inválidos',()=>{
 assert.equal(validarAcessoCemig(' user ',' secret ').senha,' secret ');
 for(const [login,senha] of [[null,'secret'],['','secret'],['user',''],['user','x'.repeat(513)],['u\nser','secret']])assert.throws(()=>validarAcessoCemig(login,senha));
});
function fakePage(url:string,token='x'.repeat(30),challenge=false){
 const writes:string[]=[];
 const input=(name:string)=>({count:async()=>1,fill:async(value:string)=>{writes.push(name);},click:async()=>{writes.push('submit');}});
 const page={url:()=>url,getByText:()=>({first:()=>({isVisible:async()=>challenge})}),
  locator:(selector:string)=>selector.startsWith('textarea')?{first:()=>({inputValue:async()=>token})}:input('password'),
  getByLabel:()=>input('login'),getByRole:()=>input('submit')} as unknown as Page;
 return {page,writes};
}
test('não preenche senha fora do domínio/path oficial, com Cloudflare ou CAPTCHA ausente',async()=>{
 for(const [url,token,cf] of [
  ['https://evil.test/Login','x'.repeat(30),false],['https://atende.cemig.com.br.evil.test/Login','x'.repeat(30),false],
  ['https://atende.cemig.com.br/home','x'.repeat(30),false],['https://atende.cemig.com.br/Login','',false],
  ['https://atende.cemig.com.br/Login','x'.repeat(30),true],
 ] as const){const {page,writes}=fakePage(url,token,cf);await assert.rejects(enviarLoginCemig(page,{login:'test',senha:'secret'},async()=>true));assert.equal(writes.length,0);}
});
test('envia somente uma entrada autorizada e não confunde envio com autenticação',async()=>{
 const {page,writes}=fakePage('https://atende.cemig.com.br/Login');
 await enviarLoginCemig(page,{login:'test',senha:'secret'},async()=>true);
 assert.deepEqual(writes,['login','password','submit']);
 const stopped=fakePage('https://atende.cemig.com.br/Login');
 await assert.rejects(enviarLoginCemig(stopped.page,{login:'test',senha:'secret'},async()=>false));assert.equal(stopped.writes.length,0);
});
