const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../../plugins/cemig-browser/rateio-login.js'),'utf8');
function fixture(){
 const writes=[],window={};
 class Input{constructor(value=''){this._value=value;}get value(){return this._value;}set value(v){this._value=v;writes.push(v);}getClientRects(){return [{}];}dispatchEvent(){}}
 const user=new Input('test-user'),password=new Input(),token=new Input(''),submit={getClientRects:()=>[{}],click:()=>writes.push('submit')};
 const modal={getClientRects:()=>[{}],querySelector:s=>({'#acessoModalSenhaValor':user,'#senhaModal':password,'#btnConfirmarLoginComSenha':submit,'textarea[name="g-recaptcha-response"]':token}[s])};
 function run(url='https://atende.cemig.com.br/Login',body=''){
  return vm.runInNewContext(script.replace('__ANDRADE_ACCESS__',JSON.stringify({login:'test-user',senha:'test-password'})),{location:new URL(url),document:{body:{innerText:body},querySelector:s=>s==='#modalLoginComSenha'?modal:null},window,HTMLInputElement:Input,Event:class{},getComputedStyle:()=>({visibility:'visible'})});
 }
 return {run,writes,user,token};
}
test('preenche senha no modal do mesmo titular e envia imediatamente com token válido uma só vez',()=>{
 const f=fixture();assert.equal(f.run(),'CAPTCHA');assert.deepEqual(f.writes,['test-password']);
 f.token._value='x'.repeat(30);assert.equal(f.run(),'LOGIN_ENVIADO');assert.equal(f.run(),'AGUARDANDO_LOGIN');assert.deepEqual(f.writes,['test-password','submit']);
});
test('não escreve em outro domínio, porta, titular, Cloudflare ou desafio expirado',()=>{
 const f=fixture();assert.equal(f.run('https://evil.test/Login'),'FORA_LOGIN');assert.equal(f.run('https://atende.cemig.com.br:444/Login'),'FORA_LOGIN');
 assert.equal(f.run(undefined,'Verify you are human'),'VERIFICACAO');assert.equal(f.run(undefined,'Verificação expirou'),'VERIFICACAO_EXPIRADA');
 f.user._value='other-user';assert.equal(f.run(),'FORMULARIO');assert.deepEqual(f.writes,[]);
});
