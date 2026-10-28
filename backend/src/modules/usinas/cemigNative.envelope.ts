import {createPublicKey,publicEncrypt,randomBytes,createCipheriv,constants} from 'node:crypto';
import {validarAcessoCemig} from './cemigCredential.crypto';

// Reuses the existing vault. Only the native device's ephemeral private key
// can open this envelope; no route returns a readable saved password.
export function envelopeAcessoNativo(acesso:{login:string;senha:string},input:{publicKey:string;nonce:string;usina:string},now=Date.now()){
 if(typeof input.publicKey!=='string'||input.publicKey.length>5000||! /^[a-zA-Z0-9_-]{16,128}$/.test(input.nonce)||! /^[a-zA-Z0-9_-]{1,128}$/.test(input.usina))throw new Error('Solicitação nativa inválida.');
 const pub=createPublicKey(input.publicKey);
 if(pub.asymmetricKeyType!=='rsa'||(pub.asymmetricKeyDetails?.modulusLength??0)<2048)throw new Error('Chave nativa inválida.');
 const key=randomBytes(32),iv=randomBytes(12),expiresAt=now+60000;
 const cipher=createCipheriv('aes-256-gcm',key,iv);
 const aad=JSON.stringify([input.usina,input.nonce]);cipher.setAAD(Buffer.from(aad));
 const data=Buffer.concat([cipher.update(JSON.stringify({...validarAcessoCemig(acesso.login,acesso.senha),expiresAt,usina:input.usina,nonce:input.nonce}),'utf8'),cipher.final()]);
 return {version:1,key:publicEncrypt({key:pub,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key).toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};
}
