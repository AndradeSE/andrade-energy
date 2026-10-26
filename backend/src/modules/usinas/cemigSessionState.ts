import type {BrowserContext} from 'playwright-core';
import {criptografarDado,descriptografarDado} from '../../utils/sensitiveData';

type Estado=Awaited<ReturnType<BrowserContext['storageState']>>;
const origens=['https://atende.cemig.com.br','https://www.atendimento.cemig.com.br'];
/** Preserve ordinary site authentication, never challenge/clearance cookies. */
export function filtrarEstadoCemig(state:Estado):Estado {
 if(!Array.isArray(state?.cookies)||!Array.isArray(state?.origins))throw new Error('Estado de acesso inválido.');
 return {
  cookies:state.cookies.filter(c=>['atende.cemig.com.br','www.atendimento.cemig.com.br'].includes(c.domain.replace(/^\./,''))
   &&!/^_*(?:cf|cloudflare)[_-]/i.test(c.name)&&c.secure),
  origins:state.origins.filter(o=>origens.includes(o.origin)).map(o=>({origin:o.origin,localStorage:o.localStorage})),
 };
}
export function cifrarSessaoCemig(state:Estado,empresa:string,usuario:string,versao:string){
 const data=JSON.stringify({empresa,usuario,versao,state:filtrarEstadoCemig(state)});
 if(Buffer.byteLength(data)>262144)throw new Error('Estado de acesso excede o limite.');
 return criptografarDado(data);
}
export function abrirSessaoCemig(cipher:string,empresa:string,usuario:string,versao:string):Estado {
 if(!cipher.startsWith('v1.')||cipher.length>400000)throw new Error('Estado de acesso inválido.');
 const data=JSON.parse(descriptografarDado(cipher));
 if(data.empresa!==empresa||data.usuario!==usuario||data.versao!==versao)throw new Error('Estado de acesso indisponível para esta conta.');
 return filtrarEstadoCemig(data.state);
}
export async function restaurarEstadoCemig(context:BrowserContext,state:Estado){
 const seguro=filtrarEstadoCemig(state);
 await context.addCookies(seguro.cookies);
 await context.addInitScript(({origins})=>{
  const origem=origins.find(o=>o.origin===location.origin);
  for(const item of origem?.localStorage??[])if(localStorage.getItem(item.name)===null)localStorage.setItem(item.name,item.value);
 },seguro);
}
