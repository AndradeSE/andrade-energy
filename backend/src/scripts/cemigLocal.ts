import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {CEMIG_LOGIN} from '../modules/usinas/cemigCloud.policy';
import {bloquearProtocoloNaSimulacao} from '../modules/usinas/cemigCloud.portal';
import {criarFluxoLocal,prepararRateioLocal,requisicaoLocalPermitida} from '../modules/usinas/cemigLocal';
import {prepararLoginLocal} from '../modules/usinas/cemigLocal.login';
import {FalhaLoginCemig} from '../modules/usinas/cemigLogin';
import {FalhaCapmonster} from '../modules/usinas/cemigCloud.capmonster';

async function main(){
 const args=process.argv.slice(2);
 const valor=(nome:string)=>{const i=args.indexOf(nome);return i<0?undefined:args[i+1];};
 const caminho=valor('--csv');
 if(!caminho)throw new Error('Uso: npm run cemig:local -- --csv "arquivo.csv" [--uc NUMERO] [--check]');
 const absoluto=resolve(caminho);
 if((await stat(absoluto)).size>100000)throw new Error('CSV excede o tamanho permitido.');
 const dados=prepararRateioLocal(absoluto,await readFile(absoluto,'utf8'),valor('--uc'));
 if(args.includes('--check')){console.log('CSV válido. Execução limitada à revisão, sem protocolo.');return;}
 // A separate ephemeral Chrome context; no personal profile, saved password or cloud provider.
 const browser=await chromium.launch({channel:'chrome',headless:false,args:['--start-maximized']});
 // Use the native client area, including Windows display scaling. A fixed
 // emulated viewport can place consent dialogs below the visible browser area.
 const context=await browser.newContext({locale:'pt-BR',timezoneId:'America/Sao_Paulo',viewport:null});
 await context.addInitScript(()=>{
  document.addEventListener('click',(event)=>{
   const button=(event.target as HTMLElement|null)?.closest('button');
   if(button&&/^Solicitar cadastro$/i.test(button.textContent?.trim()??'')){
    event.preventDefault();event.stopImmediatePropagation();
   }
  },true);
  document.addEventListener('submit',(event)=>{
   if([...document.querySelectorAll('button')].some(b=>/^Solicitar cadastro$/i.test(b.textContent?.trim()??''))){
    event.preventDefault();event.stopImmediatePropagation();
   }
  },true);
 });
 const portal=await context.newPage();
 await bloquearProtocoloNaSimulacao(portal);
 const fluxo=criarFluxoLocal(dados);
 const token=randomBytes(32).toString('hex');
 const nonce=randomBytes(24).toString('base64');
 let origin='';
 let loginEmCurso=false;let loginMensagem='';
 const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`);
  if(req.headers.host!==new URL(origin).host){res.writeHead(403).end();return;}
  if(req.method==='GET'&&req.url==='/'){
   res.setHeader('Content-Type','text/html; charset=utf-8');res.end(painel(token,nonce,dados.uc));return;
  }
  const permitido=requisicaoLocalPermitida(req.headers.host,req.headers.origin,
   typeof req.headers['x-cemig-local']==='string'?req.headers['x-cemig-local']:undefined,{origin,token});
  if(!permitido||req.method!=='POST'){res.writeHead(403).end();return;}
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.url==='/status'){
   const status=fluxo.status();
   res.end(JSON.stringify({...status,loginEmCurso,mensagem:status.estado==='AGUARDANDO_LOGIN'&&loginMensagem?loginMensagem:status.mensagem}));return;
  }
  if(req.url==='/preparar-login'){
   if(loginEmCurso||fluxo.status().estado!=='AGUARDANDO_LOGIN'){res.writeHead(409).end('{}');return;}
   loginEmCurso=true;loginMensagem='Preenchendo o acesso na Cemig…';
   void (async()=>{
    let body='';
    try{
     for await(const chunk of req){body+=chunk.toString('utf8');if(Buffer.byteLength(body)>4096)throw new Error();}
     const dadosLogin=JSON.parse(body);body='';
     try{
      const resultado=await prepararLoginLocal(portal,dadosLogin,async()=>!portal.isClosed(),dadosLogin.usarCapmonster===true);
      loginMensagem=resultado==='LOGIN_ENVIADO'?'Login enviado. Aguardando a confirmação do portal para continuar o rateio.':
       'Acesso preenchido. Resolva o CAPTCHA e clique em Entrar na Cemig. O rateio continuará após o login.';
     }finally{dadosLogin.login='';dadosLogin.senha='';dadosLogin.capmonster='';}
    }catch(error){
     const detalhe=error instanceof FalhaLoginCemig||error instanceof FalhaCapmonster?error.message:'Não foi possível concluir o login automático.';
     loginMensagem=`${detalhe} Confira a aba da Cemig e conclua manualmente na mesma sessão. Nenhuma tarefa será repetida automaticamente.`;
    }finally{body='';loginEmCurso=false;}
   })();
   res.end('{}');return;
  }
  if(req.url==='/abrir'){
   const pages=context.pages().filter(p=>!p.isClosed());
   const pagina=pages.find(p=>p.url().startsWith('https://www.atendimento.cemig.com.br/portal/'))??portal;
   void pagina.bringToFront().catch(()=>{});res.end('{}');return;
  }
  if(req.url==='/continuar'){
   if(portal.isClosed()){res.writeHead(409).end(JSON.stringify({mensagem:'A aba da Cemig foi fechada. Encerre o painel e abra novamente.'}));return;}
   // Switch state synchronously before accepting a second click.
   void fluxo.continuar(context.pages().filter(p=>!p.isClosed()),portal);
   res.end(JSON.stringify(fluxo.status()));return;
  }
  res.writeHead(404).end('{}');
 });
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
 const address=server.address();if(!address||typeof address==='string')throw new Error('Não foi possível iniciar o painel local.');
 origin=`http://127.0.0.1:${address.port}`;
 // Detect a completed manual login once. Never retry a failed flow on a timer.
 let inicioAutomatico=false;
 const timer=setInterval(()=>{
  if(inicioAutomatico||fluxo.status().estado!=='AGUARDANDO_LOGIN')return;
  const pages=context.pages().filter(p=>!p.isClosed());
  const autenticada=pages.find(p=>{
   try{const u=new URL(p.url());return u.origin==='https://www.atendimento.cemig.com.br'&&u.pathname.startsWith('/portal/');}catch{return false;}
  });
  if(autenticada){inicioAutomatico=true;void fluxo.continuar(pages,autenticada);}
 },1500);
 const fechar=()=>{clearInterval(timer);server.close();void browser.close();};
 browser.on('disconnected',()=>{clearInterval(timer);server.close();});process.once('SIGINT',fechar);process.once('SIGTERM',fechar);
 if(!args.includes('--painel-externo')){
  const dashboard=await context.newPage();await dashboard.goto(origin);
 }
 console.log(`Painel local: ${origin}. Feche o Chrome de teste para encerrar. Nenhum protocolo será solicitado.`);
 try{await portal.goto(CEMIG_LOGIN,{waitUntil:'domcontentloaded',timeout:45000});await portal.bringToFront();}
 catch{console.log('A abertura demorou. Confira a aba da Cemig; o painel continua disponível.');}
}

function painel(token:string,nonce:string,uc:string){return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Andrade · Rateio local Preview</title>
<style nonce="${nonce}">body{font:17px system-ui;background:#edf5f1;color:#123c2b;margin:0;padding:24px}main{max-width:700px;margin:6vh auto;background:white;border:1px solid #c7ded1;border-radius:24px;padding:32px}h1{font-size:28px}button{font:inherit;border-radius:12px;padding:14px 20px;margin:8px 8px 8px 0;border:1px solid #0a8050;background:#07864f;color:white;cursor:pointer}button:disabled{opacity:.45;cursor:default}p{line-height:1.6}#estado{padding:18px;background:#edf5f1;border-radius:12px;overflow-wrap:anywhere}</style>
<main><small>PREVIEW · NAVEGADOR LOCAL</small><h1>Rateio mensal</h1><p>UC geradora <strong>${uc}</strong>. A planilha já foi carregada e validada.</p><p>Ao detectar a entrada no portal, o robô selecionará a usina, anexará o CSV e parará na revisão.</p>
<details id="acesso"><summary>Preencher acesso automaticamente</summary><p>Usados somente nesta sessão local. Usuário e senha são preenchidos apenas no domínio oficial da Cemig. A chave do CapMonster é enviada apenas à API oficial do provedor. Os dados não são salvos em arquivo.</p>
<label>Usuário Cemig <input id="usuario" autocomplete="off" maxlength="254"></label><br><label>Senha Cemig <input id="senha" type="password" autocomplete="off" maxlength="512"></label><br><label>Chave CapMonster (opcional) <input id="capmonster" type="password" autocomplete="off" maxlength="256"></label>
<p><label><input id="usarCapmonster" type="checkbox" checked> Resolver reCAPTCHA com CapMonster, usando somente o bônus de teste existente (até US$ 0,10). O provedor recebe URL e dados técnicos do desafio, sem usuário, senha ou CSV. Sem chave ou se falhar, conclua manualmente. Não haverá compra nem recarga.</label></p><button id="preparar">Preencher e continuar</button></details>
<button id="abrir">Abrir Cemig</button><button id="continuar">Continuar após o login</button><p id="estado" role="status" aria-live="polite"></p><p>Teste sem protocolo. Para encerrar, feche esta janela do Chrome.</p></main>
<script nonce="${nonce}">const token=${JSON.stringify(token)};const status=document.getElementById('estado');let ocupado=false;async function api(path,body){const r=await fetch(path,{method:'POST',headers:{'X-Cemig-Local':token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw new Error('O painel local não está disponível. Confira a aba da Cemig.');return r.json();}async function atualizar(){try{const s=await api('/status');status.textContent=s.mensagem;document.getElementById('continuar').disabled=s.estado!=='AGUARDANDO_LOGIN'||ocupado||s.loginEmCurso;document.getElementById('preparar').disabled=s.estado!=='AGUARDANDO_LOGIN'||ocupado||s.loginEmCurso;}catch(e){status.textContent=e.message;document.getElementById('continuar').disabled=true;document.getElementById('preparar').disabled=true;}}document.getElementById('abrir').onclick=()=>api('/abrir').catch(e=>status.textContent=e.message);document.getElementById('continuar').onclick=async()=>{if(ocupado)return;ocupado=true;try{await api('/continuar');}catch(e){status.textContent=e.message;}finally{ocupado=false;await atualizar();}};document.getElementById('preparar').onclick=async()=>{if(ocupado)return;const usuario=document.getElementById('usuario'),senha=document.getElementById('senha'),cap=document.getElementById('capmonster');if(!usuario.value.trim()||!senha.value){status.textContent='Informe usuário e senha diretamente neste painel.';return;}ocupado=true;try{await api('/preparar-login',{login:usuario.value,senha:senha.value,capmonster:cap.value,usarCapmonster:document.getElementById('usarCapmonster').checked});document.getElementById('acesso').open=false;}catch(e){status.textContent=e.message;}finally{usuario.value='';senha.value='';cap.value='';ocupado=false;await atualizar();}};atualizar();setInterval(atualizar,1500);</script></html>`;}

void main().catch(()=>{console.error('Não foi possível iniciar. Confira o caminho do CSV, o formato Cemig, a UC geradora e se o Chrome está instalado.');process.exitCode=1;});
