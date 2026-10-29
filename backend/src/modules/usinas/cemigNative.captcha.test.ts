import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL??='https://test.supabase.co';process.env.SUPABASE_SERVICE_KEY??='test-only-service-key';
const mod=import('./cemigNative.captcha.js');
const body={autorizaCaptcha:true,nonce:'native_session_123456',desafio:{websiteURL:'https://atende.cemig.com.br/Login',websiteKey:'public_test_site_key_123456',userAgent:'test',tipo:'RecaptchaV2Task'}};
test('aceita a raiz oficial redirecionada sem enviar parâmetros nem outros caminhos',async()=>{
 const m=await mod;
 assert.equal(m.conferirDesafioNativo({...body.desafio,websiteURL:'https://atende.cemig.com.br/'}).websiteURL,'https://atende.cemig.com.br/');
 for(const websiteURL of ['https://atende.cemig.com.br/?private=value','https://atende.cemig.com.br/outra-pagina','https://atende.cemig.com.br.evil.test/'])assert.throws(()=>m.conferirDesafioNativo({...body.desafio,websiteURL}));
});
function deps(existing:any,fail=false){
 const calls:string[]=[];
 const db={from:(table:string)=>{let op='read';const q:any={select:()=>q,eq:()=>q,insert:()=>{op='insert';return q;},update:()=>{op='update';calls.push('update');return q;},maybeSingle:async()=>({data:table==='usinas'?{id:'plant'}:existing,error:null}),single:async()=>({data:{id:'task'},error:null}),then:(resolve:any)=>resolve({error:null})};return q;}};
 const provider=async(method:string)=>{calls.push(method);if(method==='getBalance')return {balance:0.05};if(fail)throw new Error('provider failed');return {taskId:10};};
 return {calls,options:{db,provider,env:{SUPABASE_URL:'https://qqhcjieymypowunkixmk.supabase.co',CAPMONSTER_API_KEY:'test-key'}} as any};
}
test('tarefa já registrada nunca cria outra e criação incerta fica bloqueada',async()=>{
 const m=await mod,a=deps({id:'existing',estado:'INCERTO'});
 assert.deepEqual(await m.iniciarCaptchaNativo('plant','company','user',body,a.options),{id:'existing',estado:'INCERTO'});assert.deepEqual(a.calls,[]);
 const b=deps(null,true);await assert.rejects(m.iniciarCaptchaNativo('plant','company','user',body,b.options),/incerto/);assert.equal(b.calls.filter(x=>x==='createTask').length,1);assert.ok(b.calls.includes('update'));
});
test('sem chave usa modo manual e desafio externo ou sem autorização não cria tarefa',async()=>{
 const m=await mod,a=deps(null);a.options.env.CAPMONSTER_API_KEY='';assert.equal((await m.iniciarCaptchaNativo('plant','company','user',body,a.options) as any).manual,true);assert.deepEqual(a.calls,[]);
 assert.throws(()=>m.conferirDesafioNativo({...body.desafio,websiteURL:'https://evil.test/Login'}));
 await assert.rejects(m.iniciarCaptchaNativo('plant','company','user',{...body,autorizaCaptcha:false},deps(null).options));
});
test('saldo acima do bônus exige autorização explícita e cria somente uma tarefa',async()=>{
 const m=await mod,a=deps(null);a.options.provider=async(method:string)=>{a.calls.push(method);return method==='getBalance'?{balance:5.0899}:{taskId:10};};
 assert.equal((await m.iniciarCaptchaNativo('plant','company','user',body,a.options) as any).manual,true);assert.deepEqual(a.calls,['getBalance']);
 a.calls.length=0;assert.deepEqual(await m.iniciarCaptchaNativo('plant','company','user',{...body,autorizaSaldoExistente:true},a.options),{id:'task',estado:'PROCESSANDO'});assert.equal(a.calls.filter(x=>x==='createTask').length,1);
});
