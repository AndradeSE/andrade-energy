import type {Page} from 'playwright-core';
import {conferirPaginaCaptcha} from './cemigCloud.capmonster';
import {validarAcessoCemig} from './cemigCredential.crypto';
export class VerificacaoCemigExpirada extends Error {
 constructor(){super('A verificação da Cemig expirou ou foi removida. O envio do formulário foi interrompido; nenhuma tentativa CAPTCHA será repetida automaticamente.');}
}
export class FalhaLoginCemig extends Error {
 constructor(etapa:'SESSAO'|'FORMULARIO'|'USUARIO'|'SENHA'|'ENVIO',contagens?:{formularios:number;usuarios:number;senhas:number;botoes:number}){
  const mensagens={SESSAO:'A sessão de login da Cemig não está disponível.',FORMULARIO:'Não foi identificado um único formulário de senha visível na Cemig.',USUARIO:'Não foi possível preencher o usuário no formulário da Cemig.',SENHA:'Não foi possível preencher a senha no formulário da Cemig.',ENVIO:'Não foi possível enviar o formulário de login da Cemig.'};
  const numero=(n:number)=>Number.isSafeInteger(n)&&n>=0?Math.min(n,99):0;
  const diagnostico=contagens?` Controles encontrados: formulários ${numero(contagens.formularios)}, usuário ${numero(contagens.usuarios)}, senha ${numero(contagens.senhas)}, entrar ${numero(contagens.botoes)}.`:'';
  super(`${mensagens[etapa]}${diagnostico} Nenhuma tentativa será repetida automaticamente.`);
 }
}
export function mesmoUsuarioCemig(atual:string,salvo:string){
 const a=atual.trim(),b=salvo.trim();
 if(a===b)return true;
 if(a.includes('@')&&b.includes('@'))return a.toLocaleLowerCase('en-US')===b.toLocaleLowerCase('en-US');
 return /^\d[\d.\/-]+$/.test(a)&&/^\d[\d.\/-]+$/.test(b)&&a.replace(/\D/g,'')===b.replace(/\D/g,'');
}
/** Validate the inherited, disabled user before paying for a CAPTCHA task. */
export async function conferirUsuarioModalCemig(page:Page,loginSalvo:string){
 conferirPaginaCaptcha(page.url());
 const usuario=page.locator('#modalLoginComSenha:visible #acessoModalSenhaValor:visible');
 if(await usuario.count()!==1||!mesmoUsuarioCemig(await usuario.inputValue({timeout:3000}),loginSalvo))
  throw new FalhaLoginCemig('USUARIO');
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
  const modal=page.locator('#modalLoginComSenha:visible');
  const modalOficial=await modal.count()===1;
  const formularios=page.locator('form').filter({has:page.locator('input[type="password"]:visible')});
  const quantidade=await formularios.count();
  const escopo=modalOficial?modal:quantidade===1?formularios:page;
  const login=modalOficial?modal.locator('#acessoModalSenhaValor:visible'):escopo.getByLabel('Usuário',{exact:true}).filter({visible:true});
  const senha=escopo.locator(modalOficial?'#senhaModal:visible':'input[type="password"]:visible');
  const entrar=modalOficial?modal.locator('#btnConfirmarLoginComSenha:visible'):escopo.getByRole('button',{name:'Entrar',exact:true}).filter({visible:true});
  const [usuarios,senhas,botoes]=await Promise.all([login.count(),senha.count(),entrar.count()]);
  if((!modalOficial&&quantidade>1)||usuarios!==1||senhas!==1||botoes!==1)throw new FalhaLoginCemig('FORMULARIO',{formularios:quantidade,usuarios,senhas,botoes});
  // Preserve fields already supplied in this session: redundant input events can
  // invalidate form state. Values are compared locally and never logged.
  etapa='USUARIO';await conferir();
  const usuarioAtual=await login.inputValue({timeout:3000});
  const mesmoUsuario=mesmoUsuarioCemig(usuarioAtual,dados.login);
  if(!mesmoUsuario){
   // The official modal's user is disabled and is inherited from the initial
   // login screen. Never enable it or silently submit another user's access.
   if(modalOficial)throw new FalhaLoginCemig('USUARIO');
   await login.fill(dados.login,{timeout:3000});
  }
  etapa='SENHA';await conferir();await conferirToken();
  if(await senha.inputValue({timeout:3000})!==dados.senha)await senha.fill(dados.senha,{timeout:3000});
  etapa='ENVIO';await conferir();await conferirToken();await entrar.click({timeout:5000});
  // A submitted form is not proof of authentication. The existing CSV validator checks login.
 }catch(error){if(error instanceof VerificacaoCemigExpirada||error instanceof FalhaLoginCemig)throw error;throw new FalhaLoginCemig(etapa);}
}
