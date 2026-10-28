const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../../plugins/cemig-browser/rateio-captcha.js'),'utf8');
function run({inside=[],outside=[],host='atende.cemig.com.br'}={}){
 const modal={getClientRects:()=>[{}],querySelectorAll:()=>inside,querySelector:()=>null};
 return JSON.parse(vm.runInNewContext(script,{location:new URL(`https://${host}/Login`),URL,navigator:{userAgent:'test'},document:{body:{innerText:''},querySelector:()=>modal,querySelectorAll:()=>outside},getComputedStyle:()=>({visibility:'visible'})}));
}
function frame(host='www.google.com'){return {src:`https://${host}/recaptcha/enterprise/anchor?k=${'x'.repeat(30)}`,getClientRects:()=>[{}]};}
test('detecta desafio oficial no modal ou único quadro visível fora dele',()=>{
 assert.equal(run({inside:[frame()]}).tipo,'RecaptchaV2EnterpriseTask');
 assert.equal(run({outside:[frame()]}).tipo,'RecaptchaV2EnterpriseTask');
});
test('não escolhe múltiplos desafios nem origens não oficiais',()=>{
 assert.equal(run({outside:[frame(),frame()]}).manual,true);
 assert.equal(run({outside:[frame('evil.test')]}).manual,true);
 assert.equal(run({host:'evil.test'}),null);
});
