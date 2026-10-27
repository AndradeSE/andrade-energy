import type {Page} from 'playwright-core';
import {validarAcessoCemig} from './cemigCredential.crypto';
import {prepararUsuarioCemig,conferirUsuarioModalCemig,enviarLoginCemig} from './cemigLogin';
import {lerDesafioCemig,obterRespostaCapmonsterLocal,aplicarRespostaCaptcha} from './cemigCloud.capmonster';

const dependencias={prepararUsuarioCemig,conferirUsuarioModalCemig,lerDesafioCemig,obterRespostaCapmonsterLocal,aplicarRespostaCaptcha,enviarLoginCemig};
export async function prepararLoginLocal(page:Page,entrada:{login:unknown;senha:unknown;capmonster?:unknown},ativo:()=>Promise<boolean>,resolver=false,deps=dependencias){
 const dados=validarAcessoCemig(entrada.login,entrada.senha);
 await deps.prepararUsuarioCemig(page,dados.login,ativo);
 await deps.conferirUsuarioModalCemig(page,dados.login);
 await page.locator('#modalLoginComSenha:visible #senhaModal:visible').fill(dados.senha,{timeout:5000});
 // The user explicitly chooses the solver in the local panel. Never infer
 // consent from a stored key, never retry tasks, never purchase balance.
 if(resolver&&typeof entrada.capmonster==='string'&&entrada.capmonster.trim()){
  const desafio=await deps.lerDesafioCemig(page);
  const token=await deps.obterRespostaCapmonsterLocal(desafio,entrada.capmonster,ativo);
  await deps.aplicarRespostaCaptcha(page,token);
  await deps.enviarLoginCemig(page,dados,ativo);
  return 'LOGIN_ENVIADO' as const;
 }
 return 'CAPTCHA_MANUAL' as const;
}
