package br.com.andradeenergy.cemig

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.work.*
import java.security.KeyStore
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

/** No bearer token, password or API key is stored in WorkManager input or plain preferences. */
object CemigAutomationStore {
 private const val ALIAS="andrade.cemig.automation.v1"
 private fun key():SecretKey {
  val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
  (store.getKey(ALIAS,null) as? SecretKey)?.let{return it}
  return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply{
   init(KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
  }.generateKey()
 }
 private fun id(usina:String):String {
  require(usina.matches(Regex("[a-zA-Z0-9_-]{1,128}")))
  return "cemig-rateio-$usina"
 }
 fun clearAll(context:Context){
  val prefs=context.getSharedPreferences("cemig_automation",Context.MODE_PRIVATE)
  for(name in prefs.all.keys)if(name.startsWith("cemig-rateio-"))WorkManager.getInstance(context).cancelUniqueWork(name)
  check(prefs.edit().clear().commit())
 }
 fun refreshToken(context:Context,token:String){
  val prefs=context.getSharedPreferences("cemig_automation",Context.MODE_PRIVATE)
  for(name in prefs.all.keys.toList())if(name.startsWith("cemig-rateio-")){
   val usina=name.removePrefix("cemig-rateio-")
   val previous=read(context,usina)?:continue
   configure(context,usina,previous.getString("base"),token,true,previous.optBoolean("solver"),previous.optString("solverAuthorization"))
  }
 }
 fun configure(context:Context,usina:String,base:String,token:String,enabled:Boolean,solver:Boolean=false,solverAuthorization:String?=null){
  val name=id(usina);val prefs=context.getSharedPreferences("cemig_automation",Context.MODE_PRIVATE)
  if(!enabled){WorkManager.getInstance(context).cancelUniqueWork(name);prefs.edit().remove(name).commit();return}
  CemigNativeAccess.validateBase(base,context.packageName.endsWith(".preview"))
  require(token.isNotBlank()&&!token.contains('\n')&&!token.contains('\r'))
  val cipher=Cipher.getInstance("AES/GCM/NoPadding").apply{init(Cipher.ENCRYPT_MODE,key());updateAAD(name.toByteArray())}
  // Only explicit enrollment creates an authorization. Token refresh and worker retries preserve it.
  val authorization=solverAuthorization?:java.util.UUID.randomUUID().toString()
  val value=JSONObject().put("base",base).put("token",token).put("usina",usina).put("solver",solver).put("solverAuthorization",authorization).toString()
  val payload=Base64.encodeToString(cipher.iv,Base64.NO_WRAP)+"."+Base64.encodeToString(cipher.doFinal(value.toByteArray()),Base64.NO_WRAP)
  check(prefs.edit().putString(name,payload).commit())
  val work=PeriodicWorkRequestBuilder<CemigAutomationWorker>(15,TimeUnit.MINUTES)
   .setInputData(workDataOf("usina" to usina)).setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build()
  WorkManager.getInstance(context).enqueueUniquePeriodicWork(name,ExistingPeriodicWorkPolicy.UPDATE,work)
 }
 fun read(context:Context,usina:String):JSONObject? {
  val name=id(usina);val raw=context.getSharedPreferences("cemig_automation",Context.MODE_PRIVATE).getString(name,null)?:return null
  val parts=raw.split('.');require(parts.size==2)
  val cipher=Cipher.getInstance("AES/GCM/NoPadding").apply{init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,Base64.decode(parts[0],Base64.DEFAULT)));updateAAD(name.toByteArray())}
  return JSONObject(String(cipher.doFinal(Base64.decode(parts[1],Base64.DEFAULT)),Charsets.UTF_8))
 }
}
