const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const script=fs.readFileSync(require('node:path').join(__dirname,'../../plugins/cemig-browser/rateio-submit.js'),'utf8');
const visible={getClientRects:()=>[{}]};
function run({config={preview:false,enviar:true,arquivo:'conferido.csv'},body='conferido.csv',url='https://atendimento.cemig.com.br/portal/services/compensation-gd',buttons=[],checks=[],window={}}={}){
 return JSON.parse(vm.runInNewContext(script.replace('__ANDRADE_SUBMIT__',JSON.stringify(config)),{window,location:{href:url},getComputedStyle:()=>({visibility:'visible'}),document:{body:{textContent:body},querySelectorAll:s=>s.startsWith('button')?buttons:checks}}));
}
test('Preview, origem diferente e arquivo não confirmado nunca enviam',()=>{
 let clicks=0;const b={...visible,innerText:'Solicitar cadastro',click:()=>clicks++};
 for(const input of [{config:{preview:true,enviar:true,arquivo:'conferido.csv'}},{url:'https://atendimento.cemig.com.br.evil/portal/services/compensation-gd'},{body:'outro.csv'}])assert.equal(run({...input,buttons:[b]}).state,'BLOQUEADO');
 assert.equal(clicks,0);
});
test('declaração única é separada do clique final e não há repetição',()=>{
 let sent=0;const window={},checkbox={...visible,checked:false,parentElement:{textContent:'Declaro que sou responsável pela veracidade das informações prestadas.'},click(){this.checked=true;}};
 const buttons=[{...visible,innerText:'Solicitar cadastro',click:()=>sent++}];
 assert.equal(run({window,buttons,checks:[checkbox]}).state,'DECLARACAO_MARCADA');assert.equal(sent,0);
 assert.equal(run({window,buttons,checks:[checkbox]}).state,'ENVIANDO');assert.equal(sent,1);
 assert.equal(run({window,buttons,checks:[checkbox]}).state,'AGUARDANDO_PROTOCOLO');assert.equal(sent,1);
});
test('número de rascunho sozinho não é protocolo confirmado',()=>{
 assert.equal(run({config:{preview:false},body:'Nº protocolo 12345678'}).state,'AGUARDANDO_PROTOCOLO');
 assert.deepEqual(run({body:'Solicitação realizada com sucesso. Número do protocolo: 12345678'}),{state:'PROTOCOLADO',protocolo:'12345678'});
 assert.equal(run({body:'Solicitação realizada com sucesso. Protocolo 12345678 Protocolo 87654321'}).state,'INCERTO');
});
test('ambiguidade ou arquivo recusado não produz clique final',()=>{
 let sent=0;const b={...visible,innerText:'Solicitar cadastro',click:()=>sent++};
 assert.equal(run({buttons:[b,b]}).state,'BLOQUEADO');
 assert.equal(run({body:'conferido.csv Template inválido',buttons:[b]}).state,'BLOQUEADO');assert.equal(sent,0);
});
