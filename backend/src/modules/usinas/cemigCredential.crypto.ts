import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
function key(env:NodeJS.ProcessEnv){
 const source=env.FINANCIAL_DATA_ENCRYPTION_KEY||env.OAUTH_TOKEN_ENCRYPTION_KEY;
 if(!source)throw new Error('Cofre indisponível.');
 return createHash('sha256').update(`cemig-credential-v1:${source}`).digest();
}
export function validarAcessoCemig(login:unknown,senha:unknown){
 if(typeof login!=='string'||typeof senha!=='string')throw new Error('Informe o acesso da Cemig.');
 const usuario=login.trim();
 if(!usuario||usuario.length>254||/[\r\n\x00]/.test(usuario)||senha.length<1||senha.length>512||senha.includes('\0'))
  throw new Error('Acesso da Cemig inválido.');
 return {login:usuario,senha};
}
export function cifrarAcessoCemig(acesso:{login:string;senha:string},empresa:string,usuario:string,env=process.env){
 const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key(env),iv);
 cipher.setAAD(Buffer.from(JSON.stringify(['cemig',empresa,usuario])));
 const content=Buffer.concat([cipher.update(JSON.stringify(validarAcessoCemig(acesso.login,acesso.senha)),'utf8'),cipher.final()]);
 return ['c1',iv.toString('base64'),cipher.getAuthTag().toString('base64'),content.toString('base64')].join('.');
}
export function abrirAcessoCemig(valor:string,empresa:string,usuario:string,env=process.env){
 try{
  const [version,iv,tag,content,...extra]=valor.split('.');
  if(version!=='c1'||extra.length)throw new Error();
  const decipher=createDecipheriv('aes-256-gcm',key(env),Buffer.from(iv,'base64'));
  decipher.setAAD(Buffer.from(JSON.stringify(['cemig',empresa,usuario])));decipher.setAuthTag(Buffer.from(tag,'base64'));
  const data=JSON.parse(Buffer.concat([decipher.update(Buffer.from(content,'base64')),decipher.final()]).toString('utf8'));
  return validarAcessoCemig(data.login,data.senha);
 }catch{throw new Error('Não foi possível abrir o cofre da Cemig.');}
}
