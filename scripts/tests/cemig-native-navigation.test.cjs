const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const script=fs.readFileSync(require('node:path').join(__dirname,'../../plugins/cemig-browser/rateio-navigation.js'),'utf8');
function run({url='https://www.atendimento.cemig.com.br/portal/services/compensation-gd',body='',controls=[],selects=[],files=[],tabs=[],combos=[],radios=[],password=false,window={},config={geradora:'1121361801894',iniciado:true}}={}){
 let assigned;
 const context={Event:class{constructor(type){this.type=type;}},location:{href:url,origin:new URL(url).origin,pathname:new URL(url).pathname,assign:url=>{assigned=url;}},window,getComputedStyle:()=>({visibility:'visible'}),document:{body:{textContent:body},querySelector:()=>password?{}:null,querySelectorAll:selector=>selector.startsWith('button')?controls:selector==='input[type=radio],[role=radio]'?radios:selector==='select'?selects:selector==='input[type=file]'?files:selector==='[role=tab]'?tabs:selector==='[role=combobox]'?combos:[]}};
 const result=JSON.parse(vm.runInNewContext(script.replace('__ANDRADE_CONFIG__',JSON.stringify(config)),context));
 return {...result,assigned};
}
const button=(label,click)=>({innerText:label,getClientRects:()=>[{}],click,disabled:false});
test('não atua fora dos hosts oficiais exatos',()=>{assert.equal(run({url:'https://atende.cemig.com.br.attacker.invalid/Login'}).state,'PAUSADO');});
test('login e verificação ficam pendentes sem cliques ou bypass',()=>{
 assert.equal(run({url:'https://atende.cemig.com.br/Login'}).state,'LOGIN');
 assert.equal(run({body:'Verify you are human'}).state,'VERIFICACAO');
});
test('redirecionamento da raiz com acesso por senha continua no fluxo de login',()=>{
 const value=run({url:'https://atende.cemig.com.br/?LoginSemSenha=True',body:'Usuário Entrar com senha Entrar com código de acesso'});
 assert.equal(value.state,'LOGIN');assert.equal(value.assigned,undefined);
});
test('seleciona somente a UC exata, sem escolher outra unidade da conta',()=>{
 const select={value:'',options:[{value:'wrong',textContent:'1038417901864'},{value:'right',textContent:'11.213.618.018-94'}],getClientRects:()=>[{}],dispatchEvent:()=>{}};
 assert.equal(run({selects:[select]}).state,'UC');assert.equal(select.value,'right');
});
test('não avança quando não localiza a UC exata',()=>{
 let clicks=0;assert.equal(run({controls:[button('Avançar',()=>clicks++)]}).state,'PAUSADO');assert.equal(clicks,0);
});
test('modalidade já selecionada avança sem substituir valor',()=>{
 let clicks=0;const select={value:'remote',options:[{value:'remote',textContent:'Autoconsumo remoto'}],getClientRects:()=>[{}],dispatchEvent:()=>{throw Error('não alterar');}};
 assert.equal(run({body:'Selecione o tipo de modalidade',selects:[select],controls:[button('Avançar',()=>clicks++)]}).state,'ALOCACAO');assert.equal(clicks,1);
});
test('campo de arquivo pausa para conferência do anexo',()=>{assert.equal(run({files:[{disabled:false}]}).state,'ANEXO');});
test('anexo autorizado usa somente campo único e não repete enquanto aguarda',()=>{
 let clicks=0;const window={};const files=[{disabled:false,click:()=>clicks++}];
 const config={geradora:'1121361801894',iniciado:true,anexoAutomatico:true,arquivo:'rateio-2026-10.csv'};
 assert.equal(run({window,files,config}).state,'ANEXO');run({window,files,config});assert.equal(clicks,1);
 run({files:[...files,...files],config});assert.equal(clicks,1);
 run({files,config:{...config,iniciado:false}});assert.equal(clicks,1);
 run({files,body:'Template inválido',config});assert.equal(clicks,1);
});
test('não navega sem início explícito nem UC válida',()=>{
 assert.equal(run({url:'https://www.atendimento.cemig.com.br/portal/home',config:{geradora:'1121361801894',iniciado:false}}).assigned,undefined);
 assert.equal(run({config:{geradora:'x',iniciado:true}}).state,'PAUSADO');
});
test('continuação aguarda o retorno normal do login e só navega da home carregada',()=>{
 assert.equal(run({url:'https://www.atendimento.cemig.com.br/portal/home',body:'Minhas unidades consumidoras'}).assigned,'https://www.atendimento.cemig.com.br/portal/services/compensation-gd');
 assert.equal(run({url:'https://atendimento.cemig.com.br/portal/home',body:'Minhas unidades consumidoras'}).assigned,'https://atendimento.cemig.com.br/portal/services/compensation-gd');
 for(const url of ['https://atende.cemig.com.br/','https://www.atendimento.cemig.com.br/portal/home?code=returning']){
  const pending=run({url});assert.equal(pending.state,'AGUARDANDO_LOGIN');assert.equal(pending.assigned,undefined);
 }
});
test('clica apenas botão único de cadastro, nunca protocolo',()=>{
 let clicks=0;
 assert.equal(run({controls:[button('Realizar cadastro',()=>clicks++)]}).state,'CADASTRO');
 assert.equal(clicks,1);
 assert.equal(run({controls:[button('Solicitar cadastro',()=>clicks++)]}).state,'REVISAO');
 assert.equal(clicks,1);
 run({controls:[button('Realizar cadastro',()=>clicks++),button('Realizar cadastro',()=>clicks++)]});assert.equal(clicks,1);
});

test('login aceita www e porta HTTPS padr�o, sem ampliar dom�nio',()=>{assert.equal(run({url:'https://www.atende.cemig.com.br:443/Login'}).state,'LOGIN');assert.equal(run({url:'https://atende.cemig.com.br:444/Login'}).state,'PAUSADO');});

test('cartao exige UC exata',()=>{let clicks=0;assert.equal(run({controls:[button('Nº da unidade consumidora: 11.213.618.018-94',()=>clicks++)]}).state,'UC');assert.equal(clicks,1);assert.equal(run({controls:[button('Nº da unidade consumidora: 1038417901864',()=>clicks++)]}).state,'PAUSADO');assert.equal(clicks,1);});
test('modalidade customizada e aba de anexo',()=>{let clicks=0;assert.equal(run({body:'Selecione o tipo de modalidade',combos:[button('Autoconsumo remoto',()=>{})],controls:[button('Avançar',()=>clicks++)]}).state,'ALOCACAO');assert.equal(clicks,1);assert.equal(run({tabs:[{...button('Inserir por anexo',()=>clicks++),getAttribute:()=> 'false'}]}).state,'ANEXO');assert.equal(clicks,2);});
test('anexo so avanca confirmado e visivel',()=>{let clicks=0;const config={geradora:'1121361801894',iniciado:true,anexado:true,arquivo:'rateio-2026-10.csv'};assert.equal(run({config,body:'rateio-2026-10.csv',controls:[button('Avançar',()=>clicks++)]}).state,'REVISAO');assert.equal(clicks,1);run({config,body:'Outro arquivo',controls:[button('Avançar',()=>clicks++)]});assert.equal(clicks,1);});

test('radio móvel seleciona somente UC exata e avança só quando marcada',()=>{
 let clicks=0,advances=0;
 const card={innerText:'Nº da unidade consumidora: 10.384.179.018-64',parentElement:null,getClientRects:()=>[{}]};
 const radio={...button('',()=>clicks++),checked:false,parentElement:card,getAttribute:()=>null,getClientRects:()=>[]};
 const config={geradora:'1038417901864',iniciado:true};
 assert.equal(run({config,radios:[radio]}).state,'UC'); assert.equal(clicks,1);
 radio.checked=true;
 assert.equal(run({config,radios:[radio],controls:[button('Avançar',()=>advances++)]}).state,'MODALIDADE');assert.equal(advances,1);
 assert.equal(run({radios:[radio],controls:[button('Avançar',()=>advances++)]}).state,'PAUSADO');assert.equal(advances,1);
 card.innerText+=' Nº da unidade consumidora: 11.213.618.018-94';
 assert.equal(run({config,radios:[radio]}).state,'PAUSADO');
});

test('arquivo recusado nunca avança mesmo com nome visível',()=>{
 let clicks=0;
 assert.equal(run({body:'Atenção! Template inválido rateio-2026-10.csv',config:{geradora:'1121361801894',iniciado:true,anexado:true,arquivo:'rateio-2026-10.csv'},controls:[button('Avançar',()=>clicks++)]}).state,'ARQUIVO_RECUSADO');
 assert.equal(clicks,0);
});
