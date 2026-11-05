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

/** Preview stops at review. Production requires an explicit server-side submission grant. */
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
 private var detectorPending=false
 private var detectorAttempts=0
 private var processing=false
 private var lastState=""
 private var loginWaitSince=0L
 private val preview get()=applicationContext.packageName.endsWith(".preview")
 private var submissionReserved=false
 private var submissionClicked=false
 private var submissionWaitSince=0L
 private var confirmedProtocol:String?=null
 private var reading:JSONObject?=null
 private var readingConfig:JSONObject?=null
 private var readingReturn:JSONObject?=null
 private var readingStep="preencher"
 private val readingMode get()=inputData.getBoolean("autoleitura",false)
 private var endState="AGUARDANDO_USUARIO"
 private var endMessage="Abra o app para conferir a sessão do rateio."
 private val tick=object:Runnable {override fun run(){inspect();if(!finished.get())main.postDelayed(this,1500)}}
 private fun api(suffix:String,body:JSONObject?=null):JSONObject{
  val cfg=config?:error("Configuração ausente")
  val base=cfg.getString("base")
  CemigNativeAccess.validateBase(base,preview)
  require(suffix.matches(Regex("(?:/[a-fA-F0-9-]{36}/(?:iniciar|estado))?")))
  return request("$base/usinas/${cfg.getString("usina")}/cemig-fila$suffix",body)
 }
 private fun request(url:String,body:JSONObject?=null):JSONObject{
  val cfg=config?:error("Configuração ausente")
  val c=URL(url).openConnection() as HttpsURLConnection
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
  val channel=if(readingMode)"cemig-autoleitura" else "cemig-automation"
  val label=if(readingMode)"Leitura Cemig" else "Rateio Cemig"
  val notificationId=if(readingMode)7894 else 7892
  manager.createNotificationChannel(NotificationChannel(channel,label,NotificationManager.IMPORTANCE_DEFAULT))
  val launch=applicationContext.packageManager.getLaunchIntentForPackage(applicationContext.packageName)?:Intent()
  val open=PendingIntent.getActivity(applicationContext,notificationId,launch,PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  val n=Notification.Builder(applicationContext,channel).setSmallIcon(android.R.drawable.ic_menu_view)
   .setContentTitle(if(preview)"$label · Preview" else label).setContentText(text).setStyle(Notification.BigTextStyle().bigText(text)).setContentIntent(open).setOngoing(ongoing).setAutoCancel(!ongoing).build()
  if(!ongoing)manager.notify(notificationId,n)
  return n
 }
 override fun doWork():Result{
  if(applicationContext.packageName !in setOf("com.andradese.energy.gerador.preview","com.andradese.energy.gerador"))return Result.failure()
  try{
   val usina=inputData.getString("usina")?:return Result.failure()
   config=CemigAutomationStore.read(applicationContext,usina,readingMode)?:return Result.success()
   if(readingMode)return processReading(usina)
   val list=api("")
   if(!list.optBoolean("habilitado"))return Result.success()
   val items=list.getJSONArray("itens")
   val pending=(0 until items.length()).map{items.getJSONObject(it)}.firstOrNull{it.optString("estado")=="PENDENTE"}?:return Result.success()
   job=api("/${pending.getString("id")}/iniciar",JSONObject())
   if(!preview&&(job!!.optBoolean("simulacao",true)||!job!!.optBoolean("permiteProtocolo")))return Result.failure()
   val notification=notify(if(preview)"Conferindo o rateio em segundo plano. Protocolo definitivo bloqueado." else "Conferindo o rateio autorizado em segundo plano.",true)
   val info=if(Build.VERSION.SDK_INT>=29)ForegroundInfo(7891,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC) else ForegroundInfo(7891,notification)
   setForegroundAsync(info).get()
   savedAccess=CemigNativeAccess.load(config!!.getString("base"),config!!.getString("token"),usina,preview)
   val plano=job!!.getJSONObject("plano")
   val folder=File(applicationContext.cacheDir,"cemig-preview").apply{mkdirs()}
   csvFile=File(folder,"background-${job!!.getString("id")}.csv").apply{writeText(plano.getString("csv"),Charsets.UTF_8)}
   main.post{openBrowser()}
   done.await(8,TimeUnit.MINUTES)
   finished.set(true)
   if(isStopped)return Result.success()
   if(submissionReserved&&endState !in setOf("PROTOCOLADO","INCERTO"))endState="INCERTO"
   saveState(endState,confirmedProtocol)
   notify(endMessage)
   return Result.success()
  }catch(error:Exception){
   if(job!=null&&config!=null&&!isStopped){try{saveState(if(submissionReserved)"INCERTO" else "AGUARDANDO_USUARIO")}catch(_:Exception){}}
   if(error.message=="HTTP_401")inputData.getString("usina")?.let{CemigAutomationStore.configure(applicationContext,it,"","",false,reading=readingMode)}
   if(reading!=null)notify("Confira a leitura no app. Um envio reservado não será repetido.")
   // Consultar a fila não é iniciar um rateio. Falhas antes do claim não
   // podem produzir um aviso de falha de envio sem existir tarefa reservada.
   if(job!=null)notify("O rateio não foi confirmado. Confira a automação no app; nenhum protocolo será repetido automaticamente.")
   return Result.success()
  }finally{
   finished.set(true);savedAccess=null;config=null
   main.post{main.removeCallbacks(tick);web?.stopLoading();web?.destroy();web=null;csvFile?.delete()}
  }
 }
 private fun processReading(usina:String):Result {
  if(Build.VERSION.SDK_INT<26)return Result.failure()
  val cfg=config!!
  val base=cfg.getString("base")
  CemigNativeAccess.validateBase(base,preview)
  require(usina.matches(Regex("[a-zA-Z0-9_-]{1,128}")))
  val items=request("$base/clientes/autoleitura/fila/$usina").getJSONArray("itens")
  if(items.length()==0)return Result.success()
  val item=items.getJSONObject(0)
  val uc=item.getJSONObject("unidades_consumidoras").getString("numero").filter{it in '0'..'9'}
  val date=java.time.LocalDate.parse(item.getString("data_programada"))
  val locale=java.util.Locale.forLanguageTag("pt-BR")
  val today=java.time.LocalDate.now(java.time.ZoneId.of("America/Sao_Paulo"))
  readingConfig=JSONObject().put("uc",uc).put("leitura",item.getInt("leitura_kwh").toString())
   .put("dataLocal",today.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/uuuu")))
   .put("referencia",date.format(java.time.format.DateTimeFormatter.ofPattern("MMMM/uuuu",locale)))
   .put("somenteConferencia",preview).put("abrirRevisao",!preview)
  reading=item
  val notice=notify("Conferindo a leitura rural da Cemig.",true)
  val info=if(Build.VERSION.SDK_INT>=29)ForegroundInfo(7893,notice,ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC) else ForegroundInfo(7893,notice)
  setForegroundAsync(info).get()
  savedAccess=CemigNativeAccess.load(base,cfg.getString("token"),usina,preview)
  endMessage="A leitura aguarda conferência no aplicativo."
  main.post{openBrowser()}
  done.await(3,TimeUnit.MINUTES)
  finished.set(true)
  if(submissionReserved){
   val result=readingReturn?:JSONObject().put("estado","EM_REVISAO")
   readingRequest("retorno",result)
  }
  if(!isStopped)notify(endMessage)
  return Result.success()
 }
 private fun readingRequest(action:String,body:JSONObject):JSONObject {
  val item=reading!!
  val unit=item.getString("unidade_id")
  val id=item.getString("id")
  val uuid=Regex("[a-fA-F0-9-]{36}")
  require(uuid.matches(unit)&&uuid.matches(id)&&action in setOf("reservar","retorno"))
  return request("${config!!.getString("base")}/clientes/unidade/$unit/autoleitura/$id/$action",body)
 }
 private fun inspectReading(view:WebView){
  val url=Uri.parse(view.url?:return)
  if(url.path.equals("/Login",true)||url.host=="atende.cemig.com.br"){
   login(view)
   return
  }
  if(url.path?.startsWith("/portal/home")==true && url.host in setOf("www.atendimento.cemig.com.br","atendimento.cemig.com.br")){
   view.loadUrl("https://${url.host}/portal/services/inform-reading")
   return
  }
  if(url.path!="/portal/services/inform-reading")return
  val cfg=readingConfig?:return
  if(readingStep=="retorno"&&android.os.SystemClock.elapsedRealtime()-submissionWaitSince>45000){
   stop("EM_REVISAO","A Cemig não confirmou o protocolo. Confira no aplicativo.")
   return
  }
  val script=applicationContext.assets.open("cemig-autoleitura-$readingStep.js")
   .bufferedReader().use{it.readText()}
   .replace("__ANDRADE_CONFIG__",cfg.put("envioReservado",submissionReserved).toString())
  processing=true
  view.evaluateJavascript(script){raw->
   processing=false
   if(finished.get())return@evaluateJavascript
   when(raw?.trim('"')){
    "UC_NAO_CONFIRMADA"->stop("AGUARDANDO_USUARIO","Selecione a UC da leitura na Cemig pelo aplicativo.")
    "LEITURA_PREENCHIDA"->stop("REVISAO","Leitura preenchida no Preview para conferência.")
    "AGUARDANDO_CONFIRMACAO"->readingStep="confirmar"
    "DADOS_ALTERADOS"->stop("EM_REVISAO","Os dados da Cemig mudaram. Confira a leitura no aplicativo.")
    "AGUARDANDO_RESERVA"->{
     if(preview)return@evaluateJavascript
     processing=true
     Thread{
      val reserved=runCatching{readingRequest("reservar",JSONObject().put("leitura",cfg.getInt("leitura")))}.isSuccess
      main.post{
       submissionReserved=reserved
       processing=false
       if(!reserved)stop("EM_REVISAO","A leitura não está mais disponível para envio.")
      }
     }.start()
    }
    "AGUARDANDO_RETORNO"->{readingStep="retorno";submissionWaitSince=android.os.SystemClock.elapsedRealtime()}
    else->if(readingStep=="retorno"){
     val result=runCatching{JSONObject(raw.orEmpty())}.getOrNull()
     if(result?.optString("estado")=="ENVIADA"){
      readingReturn=result
      stop("ENVIADA","Leitura enviada. Protocolo ${result.getString("protocolo")}.")
     }
    }
   }
  }
 }
 private fun stop(state:String,message:String){if(finished.compareAndSet(false,true)){endState=state;endMessage=message;done.countDown()}}
 private fun saveState(state:String,protocol:String?=null){
  val body=JSONObject().put("leaseId",job!!.getString("leaseId")).put("hash",job!!.getString("hash")).put("estado",state)
  if(protocol!=null)body.put("protocolo",protocol)
  if(state=="FALHA"&&endMessage=="A Cemig recusou o arquivo. Confira os dados do rateio.")body.put("motivo","ARQUIVO_RECUSADO")
  api("/${job!!.getString("id")}/estado",body)
 }
 private fun reserveSubmission(view:WebView){
  if(preview||job?.optBoolean("simulacao",true)!=false||job?.optBoolean("permiteProtocolo")!=true){stop("REVISAO","O teste automático chegou à revisão do CSV. Nenhum protocolo foi enviado.");return}
  processing=true
  Thread{try{
   saveState("REVISAO")
   // Persist before any portal click. A lost response is never permission to retry.
   submissionReserved=true
   saveState("ENVIANDO")
   main.post{processing=false;submissionWaitSince=android.os.SystemClock.elapsedRealtime();inspectSubmission(view)}
  }catch(_:Exception){main.post{stop("INCERTO","Não foi possível confirmar a reserva do envio. Confira no app antes de repetir.")}}}.start()
 }
 private fun inspectSubmission(view:WebView){
  if(processing||finished.get())return
  if(android.os.SystemClock.elapsedRealtime()-submissionWaitSince>60000){stop("INCERTO","A Cemig não confirmou o protocolo. Confira no portal; o envio não será repetido.");return}
  processing=true
  val cfg=JSONObject().put("preview",preview).put("enviar",!submissionClicked).put("arquivo",csvFile!!.name)
  val script=applicationContext.assets.open("cemig-rateio-submit.js").bufferedReader().use{it.readText()}.replace("__ANDRADE_SUBMIT__",cfg.toString())
  view.evaluateJavascript(script){raw->
   processing=false
   try{val value=JSONObject(JSONTokener(raw).nextValue() as String)
    when(value.getString("state")){
     "ENVIANDO"->{submissionClicked=true}
     "PROTOCOLADO"->{val protocol=value.getString("protocolo");if(!protocol.matches(Regex("\\d{6,30}")))throw IllegalStateException();confirmedProtocol=protocol;stop("PROTOCOLADO","Rateio enviado. Protocolo $protocol.")}
     "BLOQUEADO","INCERTO"->stop("INCERTO","A etapa final mudou ou não foi confirmada. Confira no portal; nenhum envio será repetido.")
    }
   }catch(_:Exception){stop("INCERTO","Não foi possível confirmar o retorno da Cemig. Confira no portal antes de repetir.")}
  }
 }
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
     override fun shouldOverrideUrlLoading(view:WebView,r:WebResourceRequest):Boolean{
      val blocked=r.isForMainFrame&&!CemigBrowserService.allowed(r.url.toString())
      if(blocked)stop("AGUARDANDO_USUARIO","O retorno do login saiu dos destinos autorizados. Confira a sessão no app.")
      return blocked
     }
     override fun onReceivedSslError(v:WebView,h:SslErrorHandler,e:android.net.http.SslError){h.cancel();stop("AGUARDANDO_USUARIO","A conexão segura da Cemig não foi confirmada. Confira no app.")}
     override fun onRenderProcessGone(v:WebView,d:RenderProcessGoneDetail):Boolean{stop("AGUARDANDO_USUARIO","O navegador foi interrompido. Confira o rateio no app.");return true}
     override fun onPageFinished(v:WebView,url:String){if(!CemigBrowserService.allowed(url))return
      if(preview)v.evaluateJavascript("""(function(){document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button,input[type=submit]');if(b&&/solicitar cadastro/i.test(b.innerText||b.value||'')){e.preventDefault();e.stopImmediatePropagation();}},true);document.addEventListener('submit',function(e){if(Array.from(e.target.querySelectorAll('button,input[type=submit]')).some(function(b){return /solicitar cadastro/i.test(b.innerText||b.value||'');})){e.preventDefault();e.stopImmediatePropagation();}},true);})();""",null)
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
  if(readingMode){inspectReading(view);return}
  if(submissionReserved){inspectSubmission(view);return}
  processing=true
  val plano=job!!.getJSONObject("plano")
  val geradora=Regex("-(\\d{6,20})\\.csv$").find(plano.getString("arquivo"))?.groupValues?.get(1)?:return stop("FALHA","CSV sem UC geradora.")
  val cfg=JSONObject().put("geradora",geradora).put("iniciado",true).put("anexado",attached).put("arquivo",csvFile!!.name).put("anexoAutomatico",true)
  // The queue already validates this exact CSV and hash. Supply only its in-memory contents;
  // no file picker, filesystem permission or unrelated device file is exposed to the page.
  cfg.put("conteudoCsv",plano.getString("csv"))
  val script=applicationContext.assets.open("cemig-rateio-navigation.js").bufferedReader().use{it.readText()}.replace("__ANDRADE_CONFIG__",cfg.toString())
  // The cookie choice is non-binding and never interacts with a security challenge.
  view.evaluateJavascript("(function(){var b=Array.from(document.querySelectorAll('button')).filter(function(x){return x.getClientRects().length&&/^Reject All$/i.test(x.textContent.trim());});if(b.length===1)b[0].click();})();"+script){raw->
   processing=false
   if(finished.get())return@evaluateJavascript
   try{val state=JSONObject(JSONTokener(raw).nextValue() as String).getString("state")
    if(state!=lastState&&state.matches(Regex("[A-Z_]{1,40}"))){
     // Never log the URL itself: redirects can contain authorization codes or identifiers.
     val uri=Uri.parse(view.url?:"")
     val page=when {uri.path.orEmpty().contains("compensation-gd")->"SERVICO";uri.path=="/portal/home"->"HOME";uri.path.equals("/Login",true)->"LOGIN";uri.path=="/"->"RAIZ";else->"OUTRA"}
     android.util.Log.i("CemigAutomation","Preview state=$state page=$page");lastState=state
    }
    if(state=="AGUARDANDO_LOGIN"){
     if(loginWaitSince==0L)loginWaitSince=android.os.SystemClock.elapsedRealtime()
     if(android.os.SystemClock.elapsedRealtime()-loginWaitSince>=60000L){stop("AGUARDANDO_USUARIO","A Cemig não confirmou o retorno do login em um minuto. Nenhum protocolo foi enviado; confira a sessão no app.");return@evaluateJavascript}
    }else loginWaitSince=0L
    when(state){
     "REVISAO"->reserveSubmission(view)
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
   if(raw=="\"CAPTCHA\""&&!solverRequested&&!detectorPending){
    if(config?.optBoolean("solver")!=true){stop("AGUARDANDO_USUARIO","O teste pediu CAPTCHA. Nenhum crédito foi usado; confira no app.");return@evaluateJavascript}
    detectorPending=true
    detectorAttempts++
    val detector=applicationContext.assets.open("cemig-rateio-captcha.js").bufferedReader().use{it.readText()}
    view.evaluateJavascript(detector){value->
     detectorPending=false
     if(finished.get())return@evaluateJavascript
     val challenge=try{JSONObject(JSONTokener(value).nextValue() as String)}catch(_:Exception){null}
     val reason=challenge?.optString("motivo")?:"DESAFIO_AINDA_NAO_DISPONIVEL"
     if(challenge==null||challenge.optBoolean("manual")){
      if(reason in listOf("IFRAME_NAO_IDENTIFICADO","DESAFIO_AINDA_NAO_DISPONIVEL")&&detectorAttempts<10)return@evaluateJavascript
      android.util.Log.i("CemigAutomation","Preview detector="+reason.takeIf{it.matches(Regex("[A-Z_]{1,60}"))}.orEmpty())
      stop("AGUARDANDO_USUARIO","O desafio não foi identificado com segurança. Nenhum crédito foi usado; confira no app.");return@evaluateJavascript
     }
     solverRequested=true
     Thread{try{
      val c=config?:return@Thread
      val authorization=c.optString("solverAuthorization")
      require(authorization.matches(Regex("[a-fA-F0-9-]{36}"))){"AUTORIZACAO_AUSENTE"}
      val nonce=(reading ?: job!!).getString("id")+"_"+authorization
      val answer=CemigNativeAccess.solve(c.getString("base"),c.getString("token"),c.getString("usina"),preview,nonce,challenge){!finished.get()}?:error("Sem resposta")
      main.post{val current=Uri.parse(view.url?:"");val expected=Uri.parse(challenge.getString("websiteURL"));if(!finished.get()&&current.scheme==expected.scheme&&current.host==expected.host&&current.port==expected.port&&current.path==expected.path){
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
