import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,privateDecrypt,createDecipheriv,constants} from 'node:crypto';
import {envelopeAcessoNativo} from './cemigNative.envelope';
test('cofre só é legível pelo aparelho, vinculado à usina e sessão com prazo curto',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const input={usina:'plant-a',nonce:'session_nonce_123456',publicKey:publicKey.export({type:'spki',format:'pem'}).toString()};
 const env=envelopeAcessoNativo({login:'test-user',senha:'test-password'},input,1000);
 assert.equal(JSON.stringify(env).includes('test-password'),false);
 const key=privateDecrypt({key:privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(env.key,'base64'));
 function read(usina:string){const d=createDecipheriv('aes-256-gcm',key,Buffer.from(env.iv,'base64'));d.setAAD(Buffer.from(JSON.stringify([usina,input.nonce])));d.setAuthTag(Buffer.from(env.tag,'base64'));return JSON.parse(Buffer.concat([d.update(Buffer.from(env.data,'base64')),d.final()]).toString());}
 assert.equal(read('plant-a').expiresAt,61000);assert.equal(read('plant-a').senha,'test-password');assert.throws(()=>read('plant-b'));
 const other=generateKeyPairSync('rsa',{modulusLength:2048});assert.throws(()=>privateDecrypt({key:other.privateKey,oaepHash:'sha256'},Buffer.from(env.key,'base64')));
});
