import type {Page} from 'playwright-core';
import {conferirPaginaCaptcha} from './cemigCloud.capmonster';
import {validarAcessoCemig} from './cemigCredential.crypto';
export class VerificacaoCemigExpirada extends Error {
 constructor(){super('A verificação da Cemig expirou ou foi removida. O envio do formulário foi interrompido; nenhuma tentativa CAPTCHA será repetida automaticamente.');}
}
export async function enviarLoginCemig(page:Page,acesso:{login:string;senha:string},ativo:()=>Promise<boolean>){
 const dados=validarAcessoCemig(acesso.login,acesso.senha);
 const conferir=async()=>{conferirPaginaCaptcha(page.url());if(!await ativo())throw new Error();};
 try{
  await conferir();
  const verificacao=page.getByText(/Performing security verification|Verify you are human|Verifique se você é humano/i).first();
  if(await verificacao.isVisible())throw new Error();
  const conferirToken=async()=>{
   const expirou=page.getByText(/(?:verifica[çc][aã]o|verification).*(?:expir|expired)|(?:expir|expired).*(?:verifica|verification)/i).first();
   if(await expirou.isVisible())throw new VerificacaoCemigExpirada();
   const resposta=await page.locator('textarea[name="g-recaptcha-response"]').first().inputValue({timeout:3000});
   if(resposta.length<20)throw new VerificacaoCemigExpirada();
  };
  await conferirToken();
  const login=page.getByLabel('Usuário',{exact:true});
  const senha=page.locator('input[type="password"]:visible');
  const entrar=page.getByRole('button',{name:'Entrar',exact:true});
  if(await login.count()!==1||await senha.count()!==1||await entrar.count()!==1)throw new Error();
  await conferir();await login.fill(dados.login,{timeout:3000});
  await conferir();await conferirToken();await senha.fill(dados.senha,{timeout:3000});
  await conferir();await conferirToken();await entrar.click({timeout:5000});
  // A submitted form is not proof of authentication. The existing CSV validator checks login.
 }catch(error){if(error instanceof VerificacaoCemigExpirada)throw error;throw new Error('Login não confirmado. Confira a verificação de segurança e o acesso salvo; nenhuma nova tentativa será feita automaticamente.');}
}
