package br.com.andradeenergy.cemig

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.*
import android.view.View
import android.webkit.*
import androidx.core.content.FileProvider
import androidx.work.*
import org.json.JSONObject
import org.json.JSONTokener
import java.io.File
import java.net.URL
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import javax.net.ssl.HttpsURLConnection

/** Preview-only unattended run. The definitive protocol is blocked by both server and worker. */
class CemigAutomationWorker(context:Context,params:WorkerParameters):Worker(context,params){
 private val main=Handler(Looper.getMainLooper())
 private val finished=AtomicBoolean(false)
 private val done=CountDownLatch(1)
 private var web:WebView?=null
 private var csvFile:File?=null
 private var attachment:Uri?=null
 private var config:JSONObject?=null
 private var job:JSONObject?=null
 private var savedAccess:JSONObject?=null
 private var attached=false
 private var solverRequested=false
 private var processing=false
 private var endState="AGUARDANDO_USUARIO"
 private var endMessage="Abra o app para conferir a sessão do rateio."
 private val tick=object:Runnable {override fun run(){inspect();if(!finished.get())main.postDelayed(this,1500)}}
 private fun api(suffix:String,body:JSONObject?=null):JSONObject{
  val cfg=config?:error("Configuração ausente")
  val base=cfg.getString("base")
  CemigNativeAccess.validateBase(base,true)
  require(suffix.matches(Regex("(?:/[a-fA-F0-9-]{36}/(?:iniciar|estado))?")))
  val c=URL("$base/usinas/${cfg.getString("usina")}/cemig-fila$suffix").openConnection() as HttpsURLConnection
  return try{
   c.instanceFollowRedirects=false;c.connectTimeout=15000;c.readTimeout=15000;c.requestMethod=if(body==null)"GET" else "POST"
   c.setRequestProperty("Authorization","Bearer ${cfg.getString("token")}");c.setRequestProperty("Content-Type","application/json")
   if(body!=null){c.doOutput=true;c.outputStream.use{it.write(body.toString().toByteArray())}}
   check(c.responseCode==200){"HTTP_${c.responseCode}"}
   val bytes=c.inputStream.use{it.readBytes()};require(bytes.size<=180000);JSONObject(String(bytes,Charsets.UTF_8))
  }finally{c.disconnect()}
 }
 private fun notify(text:String,ongoing:Boolean=false):Notification{
  val manager=applicationContext.getSystemService(NotificationManager::class.java)
  manager.createNotificationChannel(NotificationChannel("cemig-automation","Rateio automático",NotificationManager.IMPORTANCE_DEFAULT))
  val launch=applicationContext.packageManager.getLaunchIntentForPackage(applicationContext.packageName)?:Intent()
  val open=PendingIntent.getActivity(applicationContext,7892,launch,PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  val n=Notification.Builder(applicationContext,"cemig-automation").setSmallIcon(android.R.drawable.ic_menu_view)
   .setContentTitle("Rateio Cemig · Preview").setContentText(text).setStyle(Notification.BigTextStyle().bigText(text)).setContentIntent(open).setOngoing(ongoing).setAutoCancel(!ongoing).build()
  if(!ongoing)manager.notify(7892,n)
  return n
 }
 override fun doWork():Result{
  if(!applicationContext.packageName.endsWith(".preview"))return Result.failure()
  try{
   val usina=inputData.getString("usina")?:return Result.failure()
   config=CemigAutomationStore.read(applicationContext,usina)?:return Result.success()
   val list=api("")
   if(!list.optBoolean("habilitado"))return Result.success()
   val items=list.getJSONArray("itens")
   val pending=(0 until items.length()).map{items.getJSONObject(it)}.firstOrNull{it.optString("estado")=="PENDENTE"}?:return Result.success()
   job=api("/${pending.getString("id")}/iniciar",JSONObject())
   val notification=notify("Conferindo o rateio em segundo plano. Protocolo definitivo bloqueado.",true)
   val info=if(Build.VERSION.SDK_INT>=29)ForegroundInfo(7891,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC) else ForegroundInfo(7891,notification)
   setForegroundAsync(info).get()
   savedAccess=CemigNativeAccess.load(config!!.getString("base"),config!!.getString("token"),usina,true)
   val plano=job!!.getJSONObject("plano")
   val folder=File(applicationContext.cacheDir,"cemig-preview").apply{mkdirs()}
   csvFile=File(folder,"background-${job!!.getString("id")}.csv").apply{writeText(plano.getString("csv"),Charsets.UTF_8)}
   main.post{openBrowser()}
   done.await(8,TimeUnit.MINUTES)
   finished.set(true)
   if(isStopped)return Result.success()
   api("/${job!!.getString("id")}/estado",JSONObject().put("leaseId",job!!.getString("leaseId")).put("hash",job!!.getString("hash")).put("estado",endState))
   notify(endMessage)
   return Result.success()
  }catch(error:Exception){
   if(error.message=="HTTP_401")inputData.getString("usina")?.let{CemigAutomationStore.configure(applicationContext,it,"","",false)}
   notify("O rateio não foi confirmado. Confira a automação no app; nenhum protocolo será repetido automaticamente.")
   return Result.success()
  }finally{
   finished.set(true);savedAccess=null;config=null
   main.post{main.removeCallbacks(tick);web?.stopLoading();web?.destroy();web=null;csvFile?.delete()}
  }
 }
 private fun stop(state:String,message:String){if(finished.compareAndSet(false,true)){endState=state;endMessage=message;done.countDown()}}
 private fun openBrowser(){
  if(finished.get())return
  try{
   web=WebView(applicationContext).apply{
    val width=applicationContext.resources.displayMetrics.widthPixels.coerceAtLeast(320)
    val height=applicationContext.resources.displayMetrics.heightPixels.coerceAtLeast(640)
    measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(height,View.MeasureSpec.EXACTLY));layout(0,0,width,height)
    settings.javaScriptEnabled=true;settings.domStorageEnabled=true;settings.allowFileAccess=false;settings.allowContentAccess=false
    settings.useWideViewPort=true;settings.loadWithOverviewMode=true
    settings.mixedContentMode=WebSettings.MIXED_CONTENT_NEVER_ALLOW;settings.javaScriptCanOpenWindowsAutomatically=false
    webViewClient=object:WebViewClient(){
     override fun shouldOverrideUrlLoading(view:WebView,r:WebResourceRequest)=r.isForMainFrame&&!CemigBrowserService.allowed(r.url.toString())
     override fun onReceivedSslError(v:WebView,h:SslErrorHandler,e:android.net.http.SslError){h.cancel();stop("AGUARDANDO_USUARIO","A conexão segura da Cemig não foi confirmada. Confira no app.")}
     override fun onRenderProcessGone(v:WebView,d:RenderProcessGoneDetail):Boolean{stop("AGUARDANDO_USUARIO","O navegador foi interrompido. Confira o rateio no app.");return true}
     override fun onPageFinished(v:WebView,url:String){if(!CemigBrowserService.allowed(url))return
      v.evaluateJavascript("""(function(){document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button,input[type=submit]');if(b&&/solicitar cadastro/i.test(b.innerText||b.value||'')){e.preventDefault();e.stopImmediatePropagation();}},true);document.addEventListener('submit',function(e){if(Array.from(e.target.querySelectorAll('button,input[type=submit]')).some(function(b){return /solicitar cadastro/i.test(b.innerText||b.value||'');})){e.preventDefault();e.stopImmediatePropagation();}},true);document.addEventListener('change',function(e){var i=e.target;if(!i||i.type!=='file'||!i.files||i.files.length!==1)return;var f=i.files[0];if(/\.csv$/i.test(f.name)&&f.type==='text/comma-separated-values'&&typeof DataTransfer==='function'){var t=new DataTransfer();t.items.add(new File([f],f.name,{type:'text/csv',lastModified:f.lastModified}));i.files=t.files;}},true);})();""",null)
     }
     override fun shouldInterceptRequest(v:WebView,r:WebResourceRequest):WebResourceResponse?{
      if(r.url.scheme=="content"&&r.url!=attachment)return WebResourceResponse("text/plain","UTF-8",403,"Forbidden",emptyMap(),java.io.ByteArrayInputStream(ByteArray(0)))
      return super.shouldInterceptRequest(v,r)
     }
    }
    webChromeClient=object:WebChromeClient(){
     override fun onPermissionRequest(r:PermissionRequest){r.deny()}
     override fun onShowFileChooser(v:WebView,callback:ValueCallback<Array<Uri>>,params:FileChooserParams):Boolean{
      val file=csvFile
      if(file==null||!CemigBrowserService.allowed(v.url?:"")||!Uri.parse(v.url).path.orEmpty().contains("compensation-gd")){callback.onReceiveValue(null);return true}
      attachment=FileProvider.getUriForFile(applicationContext,"${applicationContext.packageName}.cemig.preview.files",file)
      v.settings.allowContentAccess=true;attached=true;callback.onReceiveValue(arrayOf(attachment!!));return true
     }
    }
    loadUrl("https://atende.cemig.com.br/Login")
   }
   main.post(tick)
  }catch(_:Exception){stop("AGUARDANDO_USUARIO","Não foi possível abrir a sessão de teste em segundo plano.")}
 }
 private fun inspect(){
  val view=web?:return
  if(finished.get()||processing||!CemigBrowserService.allowed(view.url?:""))return
  processing=true
  val plano=job!!.getJSONObject("plano")
  val geradora=Regex("-(\\d{6,20})\\.csv$").find(plano.getString("arquivo"))?.groupValues?.get(1)?:return stop("FALHA","CSV sem UC geradora.")
  val cfg=JSONObject().put("geradora",geradora).put("iniciado",true).put("anexado",attached).put("arquivo",csvFile!!.name).put("anexoAutomatico",true)
  val script=applicationContext.assets.open("cemig-rateio-navigation.js").bufferedReader().use{it.readText()}.replace("__ANDRADE_CONFIG__",cfg.toString())
  // The cookie choice is non-binding and never interacts with a security challenge.
  view.evaluateJavascript("(function(){var b=Array.from(document.querySelectorAll('button')).filter(function(x){return x.getClientRects().length&&/^Reject All$/i.test(x.textContent.trim());});if(b.length===1)b[0].click();})();"+script){raw->
   processing=false
   if(finished.get())return@evaluateJavascript
   try{val state=JSONObject(JSONTokener(raw).nextValue() as String).getString("state")
    when(state){
     "REVISAO"->stop("REVISAO","O teste automático chegou à revisão do CSV. Nenhum protocolo foi enviado.")
     "VERIFICACAO"->stop("AGUARDANDO_USUARIO","A Cemig pediu verificação de segurança. Confira o rateio no app.")
     "ARQUIVO_RECUSADO"->stop("FALHA","A Cemig recusou o arquivo. Confira os dados do rateio.")
     "LOGIN"->login(view)
    }
   }catch(_:Exception){}
  }
 }
 private fun login(view:WebView){
  val access=savedAccess?:return
  val script=applicationContext.assets.open("cemig-rateio-login.js").bufferedReader().use{it.readText()}.replace("__ANDRADE_ACCESS__",access.toString())
  view.evaluateJavascript(script){raw->
   if(raw=="\"LOGIN_ENVIADO\"")savedAccess=null
   if(raw=="\"CAPTCHA\""&&!solverRequested){
    if(config?.optBoolean("solver")!=true){stop("AGUARDANDO_USUARIO","O teste pediu CAPTCHA. Nenhum crédito foi usado; confira no app.");return@evaluateJavascript}
    solverRequested=true
    val detector=applicationContext.assets.open("cemig-rateio-captcha.js").bufferedReader().use{it.readText()}
    view.evaluateJavascript(detector){value->
     val challenge=try{JSONObject(JSONTokener(value).nextValue() as String)}catch(_:Exception){return@evaluateJavascript}
     if(challenge.optBoolean("manual")){stop("AGUARDANDO_USUARIO","A verificação requer sua atenção no app.");return@evaluateJavascript}
     Thread{try{
      val c=config?:return@Thread
      val answer=CemigNativeAccess.solve(c.getString("base"),c.getString("token"),c.getString("usina"),true,job!!.getString("id"),challenge){!finished.get()}?:error("Sem resposta")
      main.post{if(!finished.get()&&view.url==challenge.getString("websiteURL")){
       val apply="document.querySelectorAll('textarea[name=\"g-recaptcha-response\"]').forEach(function(f){f.value=${JSONObject.quote(answer)};f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));});var w=document.querySelector('[data-callback]'),n=w&&w.dataset.callback;if(n&&/^[a-zA-Z_$][\\w$]*$/.test(n)&&typeof window[n]==='function')window[n]("+JSONObject.quote(answer)+");"
       view.evaluateJavascript(apply+script){if(it=="\"LOGIN_ENVIADO\"")savedAccess=null}
      }}
     }catch(_:Exception){main.post{stop("AGUARDANDO_USUARIO","Não foi possível concluir a verificação. Confira no app; a tarefa não será repetida.")}}}.start()
    }
   }
  }
 }
 override fun onStopped(){finished.set(true);done.countDown();main.post{web?.stopLoading();web?.destroy();web=null};super.onStopped()}
}
