import type {Page} from 'playwright-core';
import {CEMIG_PORTAL,CEMIG_LOGIN} from './cemigCloud.policy';
import {verificacaoHumanaCemig} from './cemigCloud.portal';

export type AberturaPortalCemig='PORTAL'|'LOGIN'|'VERIFICACAO'|'CARREGANDO'|'LOGIN_INCOMPLETO';
export class FalhaAberturaPortalCemig extends Error {
 constructor(public readonly codigo:'RENDERIZACAO'|'TEMPO'|'REDE'|'DESTINO'|'CONTROLE'){
  const motivo={RENDERIZACAO:'Os estilos ou formulários do login continuaram incompletos após uma recarga.',TEMPO:'O carregamento do portal excedeu o tempo disponível.',REDE:'A conexão com o portal falhou durante o carregamento.',DESTINO:'O portal redirecionou para um endereço não autorizado.',CONTROLE:'Falhou a leitura do estado da página pelo navegador.'};
  super(`Abertura Cemig [${codigo}]: ${motivo[codigo]} Nenhum protocolo foi solicitado. Nenhuma nova tentativa será iniciada automaticamente.`);
 }
}

/** Read usable login controls, never infer readiness from stylesheet metadata. */
export function loginCemigRenderizado(){
 const visivel=(elemento:Element|null)=>!!elemento&&elemento.getClientRects().length>0&&
  getComputedStyle(elemento).display!=='none'&&getComputedStyle(elemento).visibility!=='hidden';
 const modais=Array.from(document.querySelectorAll('.modal')).filter(visivel);
 const senha=document.querySelector('#modalLoginComSenha');
 if(modais.length===1&&modais[0]===senha)
  return visivel(senha.querySelector('#acessoModalSenhaValor'))&&visivel(senha.querySelector('#senhaModal'))&&
   visivel(senha.querySelector('#btnConfirmarLoginComSenha'));
 return modais.length===0&&visivel(document.querySelector('#acesso'))&&visivel(document.querySelector('#btnEntrarComSenha'));
}

/** Recover only the malformed, untouched initial document seen in the portal.
 * Never reload a page containing an identifier, password or challenge response.
 */
export function podeRecuperarLoginCemig(){
 const modais=Array.from(document.querySelectorAll('.modal')).filter(el=>
  el.getClientRects().length>0&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden');
 if(modais.length<2)return false;
 const campos=document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>(
  '#acesso,#acessoModalSenhaValor,#senhaModal,[name="g-recaptcha-response"],[name="cf-turnstile-response"]');
 return Array.from(campos).every(el=>!el.value.trim());
}

async function estadoPortalCemig(page:Page):Promise<AberturaPortalCemig>{
 const atual=new URL(page.url());
 if(![new URL(CEMIG_PORTAL).origin,'https://atende.cemig.com.br'].includes(atual.origin))
  throw new FalhaAberturaPortalCemig('DESTINO');
 if(await verificacaoHumanaCemig(page))return 'VERIFICACAO';
 if(/\/(?:login|auth)(?:\/|$)/i.test(atual.pathname))
  return await page.evaluate(loginCemigRenderizado)?'LOGIN':'CARREGANDO';
 const cadastro=page.getByRole('button',{name:'Realizar cadastro',exact:true});
 const unidades=page.getByRole('button').filter({hasText:/Nº da unidade consumidora:/}).first();
 if(await cadastro.isVisible()||await unidades.isVisible())return 'PORTAL';
 return 'CARREGANDO';
}

/** Ordinary Playwright navigation only. Never clicks or solves security challenges. */
async function abrirPortalCemigInterno(page:Page,restaurada=false):Promise<AberturaPortalCemig>{
 const destino=new URL(CEMIG_PORTAL);
 const entrada=CEMIG_LOGIN;
 if(page.url()!==entrada){
  try{await page.goto(entrada,{waitUntil:'domcontentloaded',timeout:45000});}
  catch(error){
   // A slow document can already display the official security/login page.
   // Preserve that page instead of discarding the session on a load timeout.
   const origem=new URL(page.url()).origin;
   if(!(error instanceof Error)||error.name!=='TimeoutError'||
    ![destino.origin,'https://atende.cemig.com.br'].includes(origem))throw error;
  }
 }
 const inicial=await estadoPortalCemig(page);
 if(inicial!=='CARREGANDO')return inicial;
 if(/^\/login\/?$/i.test(new URL(page.url()).pathname)){
  try{await page.waitForFunction(loginCemigRenderizado,undefined,{timeout:15000,polling:250});}
  catch(error){if(!(error instanceof Error)||error.name!=='TimeoutError')throw error;}
  let estado=await estadoPortalCemig(page);
  if(estado==='CARREGANDO'&&await page.evaluate(podeRecuperarLoginCemig)){
   // A single ordinary reload can recover failed CSS/JS downloads. This runs
   // before the worker publishes the viewer or prepares any saved identifier.
   try{await page.reload({waitUntil:'load',timeout:15000});}
   catch(error){if(!(error instanceof Error)||error.name!=='TimeoutError')throw error;}
   estado=await estadoPortalCemig(page);
   if(estado==='CARREGANDO'){
    try{await page.waitForFunction(loginCemigRenderizado,undefined,{timeout:5000,polling:250});}
    catch(error){if(!(error instanceof Error)||error.name!=='TimeoutError')throw error;}
    estado=await estadoPortalCemig(page);
   }
   if(estado==='CARREGANDO'&&await page.evaluate(podeRecuperarLoginCemig))return 'LOGIN_INCOMPLETO';
  }
  return estado;
 }
 // Wait for ordinary application readiness, never for a generic body element.
 // This reads visible state only; it does not interact with security challenges.
 try{
  await page.waitForFunction(()=>{
   const permitida=['https://www.atendimento.cemig.com.br','https://atende.cemig.com.br'].includes(location.origin);
   if(!permitida)return true; // Revalidated and rejected outside the page scope.
   if(/\/(?:login|auth)(?:\/|$)/i.test(location.pathname))return true;
   const visivel=(el:Element)=>el.getClientRects().length>0;
   const verificacao=/Verify you are human|Performing security verification|Verifique se você é humano|Verificação de segurança/i;
   if(verificacao.test(document.body?.innerText??''))return true;
   return Array.from(document.querySelectorAll('button,[role="button"]')).some(el=>
    visivel(el)&&(/^(Realizar cadastro)$/i.test(el.textContent?.trim()??'')||/Nº da unidade consumidora:/i.test(el.textContent??'')));
  },undefined,{timeout:15000,polling:250});
 }catch(error){if(!(error instanceof Error)||error.name!=='TimeoutError')throw error;}
 return estadoPortalCemig(page);
}

export async function abrirPortalCemig(page:Page,restaurada=false):Promise<AberturaPortalCemig>{
 try{return await abrirPortalCemigInterno(page,restaurada);}
 catch(error){
  if(error instanceof FalhaAberturaPortalCemig)throw error;
  // Classify locally, but never persist Playwright's raw message or private URL.
  const codigo=error instanceof Error&&error.name==='TimeoutError'?'TEMPO':
   error instanceof Error&&/net::ERR_|ECONN|ENOTFOUND|connection closed/i.test(error.message)?'REDE':'CONTROLE';
  throw new FalhaAberturaPortalCemig(codigo);
 }
}
