import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {CEMIG_LOGIN} from '../modules/usinas/cemigCloud.policy';
import {bloquearProtocoloNaSimulacao} from '../modules/usinas/cemigCloud.portal';
import {criarFluxoLocal,prepararRateioLocal,requisicaoLocalPermitida} from '../modules/usinas/cemigLocal';

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
  if(req.url==='/status'){res.end(JSON.stringify(fluxo.status()));return;}
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
 const dashboard=await context.newPage();await dashboard.goto(origin);
 console.log(`Painel local: ${origin}. Feche o Chrome de teste para encerrar. Nenhum protocolo será solicitado.`);
 try{await portal.goto(CEMIG_LOGIN,{waitUntil:'domcontentloaded',timeout:45000});await portal.bringToFront();}
 catch{console.log('A abertura demorou. Confira a aba da Cemig; o painel continua disponível.');}
}

function painel(token:string,nonce:string,uc:string){return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Andrade · Rateio local Preview</title>
<style nonce="${nonce}">body{font:17px system-ui;background:#edf5f1;color:#123c2b;margin:0;padding:24px}main{max-width:700px;margin:6vh auto;background:white;border:1px solid #c7ded1;border-radius:24px;padding:32px}h1{font-size:28px}button{font:inherit;border-radius:12px;padding:14px 20px;margin:8px 8px 8px 0;border:1px solid #0a8050;background:#07864f;color:white;cursor:pointer}button:disabled{opacity:.45;cursor:default}p{line-height:1.6}#estado{padding:18px;background:#edf5f1;border-radius:12px;overflow-wrap:anywhere}</style>
<main><small>PREVIEW · NAVEGADOR LOCAL</small><h1>Rateio mensal</h1><p>UC geradora <strong>${uc}</strong>. A planilha já foi carregada e validada.</p><p>Entre na Cemig na outra aba. Ao detectar a entrada no portal, o robô selecionará a usina, anexará o CSV e parará na revisão. Se a entrada não for detectada, use <strong>Continuar após o login</strong>.</p><button id="abrir">Abrir Cemig</button><button id="continuar">Continuar após o login</button><p id="estado" role="status" aria-live="polite"></p><p>Teste sem protocolo. Para encerrar, feche esta janela do Chrome.</p></main>
<script nonce="${nonce}">const token=${JSON.stringify(token)};const status=document.getElementById('estado');let ocupado=false;async function api(path){const r=await fetch(path,{method:'POST',headers:{'X-Cemig-Local':token}});if(!r.ok)throw new Error('O painel local não está disponível. Confira a aba da Cemig.');return r.json();}async function atualizar(){try{const s=await api('/status');status.textContent=s.mensagem;document.getElementById('continuar').disabled=s.estado!=='AGUARDANDO_LOGIN'||ocupado;}catch(e){status.textContent=e.message;document.getElementById('continuar').disabled=true;}}document.getElementById('abrir').onclick=()=>api('/abrir').catch(e=>status.textContent=e.message);document.getElementById('continuar').onclick=async()=>{if(ocupado)return;ocupado=true;try{await api('/continuar');}catch(e){status.textContent=e.message;}finally{ocupado=false;await atualizar();}};atualizar();setInterval(atualizar,1500);</script></html>`;}

void main().catch(()=>{console.error('Não foi possível iniciar. Confira o caminho do CSV, o formato Cemig, a UC geradora e se o Chrome está instalado.');process.exitCode=1;});
