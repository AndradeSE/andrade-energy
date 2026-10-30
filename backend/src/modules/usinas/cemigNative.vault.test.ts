import test from 'node:test';
import assert from 'node:assert/strict';
import {cifrarAcessoCemig,abrirAcessoCemig} from './cemigCredential.crypto';
import {podeUsarCofreNativo} from './cemigNative.policy';
process.env.SUPABASE_URL??='https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY??='test-only-service-key';
test('somente titular ou ADM pode cadastrar e abrir o cofre',()=>{
 for(const perfil of ['ADMIN','GESTOR'])assert.equal(podeUsarCofreNativo({perfil}),true);
 for(const papel_empresa of ['COLABORADOR_GERADOR','COLABORADOR_COMERCIAL']){
  for(const perfil of ['ADMIN','GESTOR'])assert.equal(podeUsarCofreNativo({perfil,papel_empresa}),false);
 }
 for(const perfil of ['CLIENTE','',undefined])assert.equal(podeUsarCofreNativo({perfil}),false);
});
test('cofre vincula a senha à empresa, usuário e usina, e detecta adulteração',()=>{
 const env={FINANCIAL_DATA_ENCRYPTION_KEY:'test-only-encryption-key'};
 const value=cifrarAcessoCemig({login:'test-login',senha:'test-password'},'company','user:plant',env);
 assert.equal(value.includes('test-password'),false);
 assert.equal(abrirAcessoCemig(value,'company','user:plant',env).senha,'test-password');
 for(const [company,user] of [['other','user:plant'],['company','other:plant'],['company','user:other']]){
  assert.throws(()=>abrirAcessoCemig(value,company,user,env));
 }
 assert.throws(()=>abrirAcessoCemig(value.slice(0,-4)+'AAAA','company','user:plant',env));
});
test('usina fora da empresa bloqueia o cofre antes de ler a credencial',async()=>{
 const {escopoCofreNativo}=await import('./cemigNative.vault.js');
 const filters:any[]=[];
 const query:any={select:()=>query,eq:(...args:any[])=>{filters.push(args);return query;},maybeSingle:async()=>({data:null,error:null})};
 await assert.rejects(escopoCofreNativo('plant','company',{db:{from:()=>query}} as any),/Acesso indisponível/);
 assert.deepEqual(filters,[['id','plant'],['empresa_id','company']]);
});
