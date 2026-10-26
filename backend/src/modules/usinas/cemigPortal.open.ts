import type {Page} from 'playwright-core';
import {CEMIG_PORTAL} from './cemigCloud.policy';
import {verificacaoHumanaCemig} from './cemigCloud.portal';

export type AberturaPortalCemig='PORTAL'|'LOGIN'|'VERIFICACAO'|'CARREGANDO';

/** Ordinary Playwright navigation only. Never clicks or solves security challenges. */
export async function abrirPortalCemig(page:Page):Promise<AberturaPortalCemig>{
 const destino=new URL(CEMIG_PORTAL);
 if(page.url()!==CEMIG_PORTAL)
  await page.goto(CEMIG_PORTAL,{waitUntil:'domcontentloaded',timeout:45000});
 const atual=new URL(page.url());
 if(![destino.origin,'https://atende.cemig.com.br'].includes(atual.origin))
  throw new Error('O portal redirecionou para um endereço não autorizado.');
 if(await verificacaoHumanaCemig(page))return 'VERIFICACAO';
 if(/\/(?:login|auth)(?:\/|$)/i.test(atual.pathname))return 'LOGIN';
 // A /portal/ URL with a loading indicator is not evidence of authentication.
 const cadastro=page.getByRole('button',{name:'Realizar cadastro',exact:true});
 const unidades=page.getByRole('button').filter({hasText:/Nº da unidade consumidora:/}).first();
 if(await cadastro.isVisible()||await unidades.isVisible())return 'PORTAL';
 return 'CARREGANDO';
}
