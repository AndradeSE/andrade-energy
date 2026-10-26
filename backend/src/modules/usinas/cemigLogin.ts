import type {Page} from 'playwright-core';
import {conferirPaginaCaptcha} from './cemigCloud.capmonster';
import {validarAcessoCemig} from './cemigCredential.crypto';
export class VerificacaoCemigExpirada extends Error {
 constructor(){super('A verificação da Cemig expirou ou foi removida. O envio do formulário foi interrompido; nenhuma tentativa CAPTCHA será repetida automaticamente.');}
}
export class FalhaLoginCemig extends Error {
 constructor(etapa:'SESSAO'|'FORMULARIO'|'USUARIO'|'SENHA'|'ENVIO'){
  const mensagens={SESSAO:'A sessão de login da Cemig não está disponível.',FORMULARIO:'Não foi identificado um único formulário de senha visível na Cemig.',USUARIO:'Não foi possível preencher o usuário no formulário da Cemig.',SENHA:'Não foi possível preencher a senha no formulário da Cemig.',ENVIO:'Não foi possível enviar o formulário de login da Cemig.'};
  super(`${mensagens[etapa]} Nenhuma tentativa será repetida automaticamente.`);
 }
}
export async function verificarExpiracaoCemig(page:Page){
 const pattern=/(?:verifica[çc][aã]o|verification).*(?:expir|expired)|(?:expir|expired).*(?:verifica|verification)/i;
 const alvos=[page,...page.frames().filter(frame=>{
  try{const u=new URL(frame.url());return ['https://www.google.com','https://www.recaptcha.net'].includes(u.origin)&&u.pathname.startsWith('/recaptcha/');}
  catch{return false;}
 })];
 for(const alvo of alvos)if(await alvo.getByText(pattern).first().isVisible())throw new VerificacaoCemigExpirada();
}
export async function enviarLoginCemig(page:Page,acesso:{login:string;senha:string},ativo:()=>Promise<boolean>){
 const dados=validarAcessoCemig(acesso.login,acesso.senha);
 const conferir=async()=>{conferirPaginaCaptcha(page.url());if(!await ativo())throw new Error();};
 let etapa:'SESSAO'|'FORMULARIO'|'USUARIO'|'SENHA'|'ENVIO'='SESSAO';
 try{
  await conferir();
  const verificacao=page.getByText(/Performing security verification|Verify you are human|Verifique se você é humano/i).first();
  if(await verificacao.isVisible())throw new Error();
  const conferirToken=async()=>{
   await verificarExpiracaoCemig(page);
   const resposta=await page.locator('textarea[name="g-recaptcha-response"]').first().inputValue({timeout:3000});
   if(resposta.length<20)throw new VerificacaoCemigExpirada();
  };
  await conferirToken();
  etapa='FORMULARIO';
  // Scope to the password form rather than the entire landing page, which
  // also renders a separate user/code form (sometimes both are visible).
  const formularios=page.locator('form').filter({has:page.locator('input[type="password"]:visible')});
  const quantidade=await formularios.count();
  if(quantidade>1)throw new Error();
  const escopo=quantidade===1?formularios:page;
  const login=escopo.getByLabel('Usuário',{exact:true}).filter({visible:true});
  const senha=escopo.locator('input[type="password"]:visible');
  const entrar=escopo.getByRole('button',{name:'Entrar',exact:true}).filter({visible:true});
  if(await login.count()!==1||await senha.count()!==1||await entrar.count()!==1)throw new Error();
  // Preserve fields already supplied in this session: redundant input events can
  // invalidate form state. Values are compared locally and never logged.
  etapa='USUARIO';await conferir();
  if(await login.inputValue({timeout:3000})!==dados.login)await login.fill(dados.login,{timeout:3000});
  etapa='SENHA';await conferir();await conferirToken();
  if(await senha.inputValue({timeout:3000})!==dados.senha)await senha.fill(dados.senha,{timeout:3000});
  etapa='ENVIO';await conferir();await conferirToken();await entrar.click({timeout:5000});
  // A submitted form is not proof of authentication. The existing CSV validator checks login.
 }catch(error){if(error instanceof VerificacaoCemigExpirada)throw error;throw new FalhaLoginCemig(etapa);}
}
