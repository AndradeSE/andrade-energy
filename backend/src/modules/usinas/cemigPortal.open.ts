import type {Page} from 'playwright-core';
import {CEMIG_PORTAL,CEMIG_LOGIN} from './cemigCloud.policy';
import {verificacaoHumanaCemig} from './cemigCloud.portal';

export type AberturaPortalCemig='PORTAL'|'LOGIN'|'VERIFICACAO'|'CARREGANDO';

async function estadoPortalCemig(page:Page):Promise<AberturaPortalCemig>{
 const atual=new URL(page.url());
 if(![new URL(CEMIG_PORTAL).origin,'https://atende.cemig.com.br'].includes(atual.origin))
  throw new Error('O portal redirecionou para um endereço não autorizado.');
 if(await verificacaoHumanaCemig(page))return 'VERIFICACAO';
 if(/\/(?:login|auth)(?:\/|$)/i.test(atual.pathname))return 'LOGIN';
 const cadastro=page.getByRole('button',{name:'Realizar cadastro',exact:true});
 const unidades=page.getByRole('button').filter({hasText:/Nº da unidade consumidora:/}).first();
 if(await cadastro.isVisible()||await unidades.isVisible())return 'PORTAL';
 return 'CARREGANDO';
}

/** Ordinary Playwright navigation only. Never clicks or solves security challenges. */
export async function abrirPortalCemig(page:Page,restaurada=false):Promise<AberturaPortalCemig>{
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
