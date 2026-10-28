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
 fun load(base:String,token:String,usina:String,preview:Boolean):JSONObject {
  val u=URL(base)
  val hosts=if(preview)setOf("andrade-energy-api-homologacao.onrender.com","andrade-energy-api-reserva-preview.onrender.com","andrade-energy-fallback-probe.netlify.app") else setOf("andrade-energy-api-vda.onrender.com","andrade-energy-api-reserva-producao.onrender.com","andrade-energy-api-reserva.netlify.app")
  require(u.protocol=="https"&&u.host in hosts&&u.port in setOf(-1,443)&&u.userInfo==null&&u.path=="/api"&&u.query==null&&u.ref==null)
  require(usina.matches(Regex("[a-zA-Z0-9_-]{1,128}"))&&token.isNotBlank()&&!token.contains('\n')&&!token.contains('\r'))
  val pair=KeyPairGenerator.getInstance("RSA").apply{initialize(2048)}.generateKeyPair()
  val publicKey="-----BEGIN PUBLIC KEY-----\n"+Base64.encodeToString(pair.public.encoded,Base64.NO_WRAP)+"\n-----END PUBLIC KEY-----"
  val nonce=java.util.UUID.randomUUID().toString()
  val connection=URL("$base/usinas/$usina/cemig-acesso/nativo").openConnection() as HttpsURLConnection
  val envelope=try {
   connection.instanceFollowRedirects=false;connection.requestMethod="POST";connection.connectTimeout=15000;connection.readTimeout=15000
   connection.setRequestProperty("Authorization","Bearer $token");connection.setRequestProperty("Content-Type","application/json");connection.doOutput=true
   connection.outputStream.use{it.write(JSONObject().put("publicKey",publicKey).put("nonce",nonce).put("autorizaLoginNativo",true).toString().toByteArray(Charsets.UTF_8))}
   require(connection.responseCode==200)
   val body=connection.inputStream.use{it.readBytes()};require(body.size<16000);JSONObject(String(body,Charsets.UTF_8))
  }finally{connection.disconnect()}
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
