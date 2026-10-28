package br.com.andradeenergy.cemig

import android.util.Base64
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import java.security.KeyPairGenerator
import java.security.spec.MGF1ParameterSpec
import javax.crypto.Cipher
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/** One in-memory device key; no passwords, API tokens or envelopes are persisted. */
object CemigNativeAccess {
 private fun request(base:String,token:String,usina:String,preview:Boolean,suffix:String,body:JSONObject?=null):JSONObject {
  val u=URL(base)
  val hosts=if(preview)setOf("andrade-energy-api-homologacao.onrender.com","andrade-energy-api-reserva-preview.onrender.com","andrade-energy-fallback-probe.netlify.app") else setOf("andrade-energy-api-vda.onrender.com","andrade-energy-api-reserva-producao.onrender.com","andrade-energy-api-reserva.netlify.app")
  require(u.protocol=="https"&&u.host in hosts&&u.port in setOf(-1,443)&&u.userInfo==null&&u.path=="/api"&&u.query==null&&u.ref==null)
  require(usina.matches(Regex("[a-zA-Z0-9_-]{1,128}"))&&token.isNotBlank()&&!token.contains('\n')&&!token.contains('\r'))
  require(suffix.matches(Regex("(?:/captcha(?:/[a-fA-F0-9-]{36})?)?")))
  val c=URL("$base/usinas/$usina/cemig-acesso/nativo$suffix").openConnection() as HttpsURLConnection
  return try{
   c.instanceFollowRedirects=false;c.requestMethod=if(body==null)"GET" else "POST";c.connectTimeout=15000;c.readTimeout=15000
   c.setRequestProperty("Authorization","Bearer $token");c.setRequestProperty("Content-Type","application/json")
   if(body!=null){c.doOutput=true;c.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}}
   val status=c.responseCode;check(status==200){"HTTP_$status"};val bytes=c.inputStream.use{it.readBytes()};require(bytes.size<40000);JSONObject(String(bytes,Charsets.UTF_8))
  }finally{c.disconnect()}
 }
 fun solve(base:String,token:String,usina:String,preview:Boolean,nonce:String,challenge:JSONObject,active:()->Boolean):String? {
  if(!active())return null
  val created=request(base,token,usina,preview,"/captcha",JSONObject().put("nonce",nonce).put("autorizaCaptcha",true).put("autorizaSaldoExistente",true).put("desafio",challenge))
  if(created.optBoolean("manual")){val reason=created.optString("motivo");throw IllegalStateException(if(reason in setOf("SEM_CONFIGURACAO","SALDO_TESTE_NAO_CONFIRMADO"))reason else "MODO_MANUAL")}
  val id=created.getString("id");require(id.matches(Regex("[a-fA-F0-9-]{36}")))
  repeat(30){
   Thread.sleep(4000);if(!active())return null
   val result=request(base,token,usina,preview,"/captcha/$id")
   if(result.optString("estado")=="RESOLVIDO"){val answer=result.getString("token");require(answer.length in 20..20000);return answer}
   if(result.optString("estado")!="PROCESSANDO")return null
  }
  return null
 }
 fun load(base:String,token:String,usina:String,preview:Boolean):JSONObject {
  val u=URL(base)
  val hosts=if(preview)setOf("andrade-energy-api-homologacao.onrender.com","andrade-energy-api-reserva-preview.onrender.com","andrade-energy-fallback-probe.netlify.app") else setOf("andrade-energy-api-vda.onrender.com","andrade-energy-api-reserva-producao.onrender.com","andrade-energy-api-reserva.netlify.app")
  require(u.protocol=="https"&&u.host in hosts&&u.port in setOf(-1,443)&&u.userInfo==null&&u.path=="/api"&&u.query==null&&u.ref==null)
  require(usina.matches(Regex("[a-zA-Z0-9_-]{1,128}"))&&token.isNotBlank()&&!token.contains('\n')&&!token.contains('\r'))
  val pair=KeyPairGenerator.getInstance("RSA").apply{initialize(2048)}.generateKeyPair()
  val publicKey="-----BEGIN PUBLIC KEY-----\n"+Base64.encodeToString(pair.public.encoded,Base64.NO_WRAP)+"\n-----END PUBLIC KEY-----"
  val nonce=java.util.UUID.randomUUID().toString()
  val envelope=request(base,token,usina,preview,"",JSONObject().put("publicKey",publicKey).put("nonce",nonce).put("autorizaLoginNativo",true))
  require(envelope.getInt("version")==1)
  fun decode(name:String)=Base64.decode(envelope.getString(name),Base64.DEFAULT)
  val rsa=Cipher.getInstance("RSA/ECB/OAEPPadding")
  rsa.init(Cipher.DECRYPT_MODE,pair.private,OAEPParameterSpec("SHA-256","MGF1",MGF1ParameterSpec.SHA256,PSource.PSpecified.DEFAULT))
  val key=rsa.doFinal(decode("key"))
  val aes=Cipher.getInstance("AES/GCM/NoPadding")
  aes.init(Cipher.DECRYPT_MODE,SecretKeySpec(key,"AES"),GCMParameterSpec(128,decode("iv")))
  aes.updateAAD(org.json.JSONArray().put(usina).put(nonce).toString().toByteArray(Charsets.UTF_8))
  val access=JSONObject(String(aes.doFinal(decode("data")+decode("tag")),Charsets.UTF_8));key.fill(0)
  val expires=access.getLong("expiresAt")
  require(access.getString("usina")==usina&&access.getString("nonce")==nonce&&expires>System.currentTimeMillis()&&expires<=System.currentTimeMillis()+65000)
  require(access.getString("login").length in 1..254&&access.getString("senha").length in 1..512)
  return JSONObject().put("login",access.getString("login")).put("senha",access.getString("senha"))
 }
}
