package br.com.andradeenergy.cemig

import android.app.*
import android.content.*
import android.graphics.Color
import android.net.Uri
import android.os.*
import android.view.ViewGroup
import android.webkit.*
import androidx.core.content.FileProvider
import java.io.File
import java.security.MessageDigest
import org.json.JSONObject
import org.json.JSONTokener

/** Preview browser session with a single scoped CSV. No definitive submission or credential bridge. */
class CemigBrowserService : Service() {
    inner class LocalBinder : Binder() { fun session() = this@CemigBrowserService }
    private val binder = LocalBinder()
    private val handler = Handler(Looper.getMainLooper())
    private val browserContext by lazy { MutableContextWrapper(this) }
    private val expire = Runnable { closeSession() }
    private var prepared:File?=null
    private var artifactHash:String?=null
    private var artifactLabel=""
    private var attachmentConfirmed=false
    private var permittedAttachmentUri:Uri?=null
    private var geradora=""
    // Preparing a production artifact is the user's explicit start action.
    // Do not require a second, hidden menu action after the login completes.
    private var navigationStarted=false
    private var evaluating=false
    private var savedAccess:JSONObject?=null
    private var accessRequested=false
    private var nativeBase=""
    private var nativeToken=""
    private var nativeUsina=""
    private var solverAllowed=false
    private var solverRequested=false
    private var solverBusy=false
    private var loginNotice:String?=null
    @Volatile private var closed=false
    private val captchaNonce=java.util.UUID.randomUUID().toString()
    fun allowSolver(){solverAllowed=true}
    fun useSavedAccess(base:String,token:String,usina:String){
        if(accessRequested)return
        accessRequested=true;nativeBase=base;nativeToken=token;nativeUsina=usina
        Thread{
            try{val access=CemigNativeAccess.load(base,token,usina,packageName.endsWith(".preview"));handler.post{if(!closed){savedAccess=access;navigationStarted=true}}}
            catch(_:Exception){handler.post{loginNotice="Acesso salvo indisponível. Confira o cadastro da Cemig no aplicativo.";progress=loginNotice!!}}
        }.start()
    }
    var progress="Entre na Cemig para continuar o rateio."
        private set
    private val navigationTick=object:Runnable { override fun run(){inspectNavigation();handler.postDelayed(this,1500)} }
    fun setGeradora(value:String){require(value.matches(Regex("\\d{6,20}"))){"UC geradora inválida."};require(geradora.isEmpty()||geradora==value){"A UC da sessão não pode ser trocada."};geradora=value}
    fun continueNavigation(){navigationStarted=true;browser.evaluateJavascript("window.__andradeLastStep=null;",null);inspectNavigation()}
    private fun inspectNavigation(){
        if(!::browser.isInitialized||evaluating||!allowed(browser.url?:""))return
        evaluating=true
        val config=JSONObject().put("geradora",geradora).put("iniciado",navigationStarted).put("anexado",attachmentConfirmed).put("arquivo",prepared?.name?:"").put("anexoAutomatico",!packageName.endsWith(".preview"))
        val script=assets.open("cemig-rateio-navigation.js").bufferedReader().use{it.readText()}.replace("__ANDRADE_CONFIG__",config.toString())
        browser.evaluateJavascript(script){raw->
            evaluating=false
            try{val json=JSONObject(JSONTokener(raw).nextValue() as String);progress=json.optString("message","Confira a etapa no portal.")+if(json.optString("state")=="PAUSADO") "\nPágina: "+Uri.parse(browser.url?:"").let{it.scheme+"://"+it.host+it.path} else ""
                if(json.optString("state")=="LOGIN")progress=if(solverBusy)"Resolvendo a verificação na mesma sessão…" else loginNotice?:progress
                if(json.optString("state")=="LOGIN"&&savedAccess!=null){
                    val loginScript=assets.open("cemig-rateio-login.js").bufferedReader().use{it.readText()}.replace("__ANDRADE_ACCESS__",savedAccess.toString())
                    browser.evaluateJavascript(loginScript){state->
                        when(state){
                            "\"LOGIN_ENVIADO\""->{savedAccess=null;progress="Login enviado. Aguardando confirmação do portal."}
                            "\"ABRINDO_SENHA\""->progress="Usuário conferido. Abrindo formulário de senha."
                            "\"FORMULARIO\""->progress="Acesso recuperado. Aguardando formulário oficial de login ficar disponível."
                            "\"CAPTCHA\""->{progress=loginNotice?:if(solverBusy)"Resolvendo a verificação na mesma sessão…" else "Acesso preenchido. Aguardando a verificação nesta sessão.";if(solverAllowed&&!solverRequested)solveCaptcha()}
                            "\"VERIFICACAO_EXPIRADA\""->progress="A verificação expirou; nenhuma tentativa será repetida automaticamente."
                        }
                    }
                }else if(json.optString("state") in setOf("PRONTO","NAVEGANDO","UC","CADASTRO","MODALIDADE","ALOCACAO","ANEXO","REVISAO"))savedAccess=null
            }
            catch(_:Exception){progress="Aguardando carregamento do portal. Nenhum protocolo foi enviado."}
        }
    }
    private fun solveCaptcha(){
        if(closed||solverRequested||nativeToken.isEmpty())return
        val detector=assets.open("cemig-rateio-captcha.js").bufferedReader().use{it.readText()}
        browser.evaluateJavascript(detector){raw->
            val challenge=try{JSONObject(JSONTokener(raw).nextValue() as String)}catch(_:Exception){return@evaluateJavascript}
              if(challenge.optBoolean("manual")){loginNotice="Desafio não identificado: "+challenge.optString("motivo")+" · quadros no formulário: "+challenge.optInt("iframes",0);return@evaluateJavascript}
            solverRequested=true;solverBusy=true;progress="Resolvendo a verificação na mesma sessão…"
            Thread{
                var failure=""
                val answer=try{CemigNativeAccess.solve(nativeBase,nativeToken,nativeUsina,packageName.endsWith(".preview"),captchaNonce,challenge){!closed}}catch(error:Exception){val code=error.message.orEmpty();if(code.matches(Regex("HTTP_[0-9]{3}|SEM_CONFIGURACAO|SALDO_TESTE_NAO_CONFIRMADO|MODO_MANUAL")))failure=" ($code)";null}
                handler.post{
                    if(closed)return@post
                    solverBusy=false
                    if(answer==null){loginNotice="Verificação automática indisponível$failure. Continue manualmente na mesma sessão; nenhuma tarefa será repetida.";progress=loginNotice!!;return@post}
                    val access=savedAccess?:return@post
                    // Public callback only, followed immediately by the validated login scopes.
                    val apply="""(function(token){if(location.origin+location.pathname!==${JSONObject.quote(challenge.getString("websiteURL"))})return;document.querySelectorAll('textarea[name="g-recaptcha-response"]').forEach(function(f){f.value=token;f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));});var w=document.querySelector('[data-callback]'),n=w&&w.dataset.callback;if(n&&/^[a-zA-Z_$][\w$]*$/.test(n)&&typeof window[n]==='function')window[n](token);})(${JSONObject.quote(answer)});"""
                    val login=assets.open("cemig-rateio-login.js").bufferedReader().use{it.readText()}.replace("__ANDRADE_ACCESS__",access.toString())
                    browser.evaluateJavascript(apply+login){state->if(state=="\"LOGIN_ENVIADO\"")savedAccess=null}
                }
            }.start()
        }
    }
    fun prepare(csv:String,competencia:String,usina:String) {
        require(csv.toByteArray(Charsets.UTF_8).size in 1..100000 && competencia.matches(Regex("20\\d{2}-(0[1-9]|1[0-2])"))) { "Arquivo inválido." }
        require(usina.matches(Regex("[a-zA-Z0-9_-]{1,128}"))) { "Usina inválida." }
        if(!packageName.endsWith(".preview"))navigationStarted=true
        val rows=csv.trim().lines().filter { it.isNotBlank() }
        require(rows.isNotEmpty()&&rows.all { it.split(';').size==4 }) { "CSV fora do padrão." }
        val hash=MessageDigest.getInstance("SHA-256").digest((usina+competencia+csv).toByteArray()).joinToString(""){"%02x".format(it)}
        require(artifactHash==null||artifactHash==hash) { "Encerre a sessão anterior antes de trocar o rateio." }
        if(artifactHash==null){
            val folder=File(cacheDir,"cemig-preview").apply { mkdirs() }
            prepared=File(folder,"rateio-$competencia.csv").apply { writeText(csv,Charsets.UTF_8) }
            artifactHash=hash;artifactLabel="Competência $competencia · ${rows.size} linha(s)"
        }
    }
    lateinit var browser: WebView
        private set
    companion object {
        const val STOP = "br.com.andradeenergy.cemig.STOP"
        const val NOTICE = 7831
        const val CHANNEL = "cemig-preview-browser"
        fun allowed(raw: String): Boolean = try {
            val uri = Uri.parse(raw)
            uri.scheme == "https" && uri.userInfo == null && (uri.port == -1 || uri.port == 443) &&
                (uri.host == "cemig.com.br" || uri.host?.endsWith(".cemig.com.br") == true)
        } catch (_: Exception) { false }
    }
    override fun onCreate() {
        super.onCreate()
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL,"Sessão Cemig Preview",NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this,0,Intent(this,CemigBrowserActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val stop = PendingIntent.getService(this,1,Intent(this,CemigBrowserService::class.java).setAction(STOP),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification = Notification.Builder(this,CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_view).setContentTitle("Cemig · navegador Preview")
            .setContentText("Sessão limitada a 10 minutos. Toque para voltar; nenhum envio automático ativo.")
            .setContentIntent(open).setOngoing(true)
            .addAction(Notification.Action.Builder(null,"Encerrar",stop).build()).build()
        startForeground(NOTICE,notification)
        browser = WebView(browserContext)
        browser.setBackgroundColor(Color.WHITE)
        // Fit tall portal dialogs in the available mobile viewport; no challenge interaction.
        browser.setInitialScale(80)
        browser.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            setGeolocationEnabled(false)
            builtInZoomControls = true
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
        }
        browser.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view:WebView,url:String) {
                if(!allowed(url))return
                view.evaluateJavascript("""(function(){
                    if(window.__andradePreviewGuard)return;window.__andradePreviewGuard=true;
                    document.addEventListener('change',function(e){
                        var input=e.target;
                        if(!input||input.type!=='file'||!input.files||input.files.length!==1)return;
                        var f=input.files[0];
                        // Android 11 WebView derives a legacy MIME from the extension,
                        // ignoring ContentProvider.getType. Normalize the same file bytes
                        // before the portal's change handler validates the standard MIME.
                        if(/\.csv$/i.test(f.name)&&f.type==='text/comma-separated-values'&&typeof DataTransfer==='function'){
                            var transfer=new DataTransfer();
                            transfer.items.add(new File([f],f.name,{type:'text/csv',lastModified:f.lastModified}));
                            input.files=transfer.files;
                            f=input.files[0];
                        }
                        var state={bytes:f.size,mime:f.type||'não informado',readable:false};
                        window.__andradeFileDiagnostic=state;
                        var reader=new FileReader();
                        reader.onload=function(){
                            var content=String(reader.result||'');
                            var rows=content.split(/\r?\n/);
                            state.readable=true;state.lines=rows.length;
                            state.columnsOk=rows.every(function(row){return row.split(';').length===4;});
                        };
                        reader.onerror=function(){state.error='Falha na leitura do arquivo pelo navegador';};
                        reader.readAsText(f,'UTF-8');
                    },true);
                    document.addEventListener('focusin',function(e){
                        if(e.target&&/^(INPUT|TEXTAREA)$/.test(e.target.tagName))setTimeout(function(){e.target.scrollIntoView({block:'center',behavior:'smooth'});},300);
                    });
                    document.addEventListener('click',function(e){
                        var b=e.target.closest&&e.target.closest('button,input[type=submit]');
                        if(${packageName.endsWith(".preview")}&&b&&/solicitar cadastro/i.test(b.innerText||b.value||'')){e.preventDefault();e.stopImmediatePropagation();alert('Simulação: protocolo definitivo bloqueado.');}
                    },true);
                    document.addEventListener('submit',function(e){
                        var buttons=Array.from(e.target.querySelectorAll('button,input[type=submit]'));
                        if(${packageName.endsWith(".preview")}&&buttons.some(function(b){return /solicitar cadastro/i.test(b.innerText||b.value||'');})){e.preventDefault();e.stopImmediatePropagation();}
                    },true);
                })();true;""",null)
            }
            override fun shouldInterceptRequest(view:WebView,request:WebResourceRequest):WebResourceResponse? {
                if(request.url.scheme == "content" && request.url != permittedAttachmentUri) {
                    return WebResourceResponse("text/plain","UTF-8",403,"Forbidden",emptyMap(),java.io.ByteArrayInputStream(ByteArray(0)))
                }
                return super.shouldInterceptRequest(view,request)
            }
            override fun shouldOverrideUrlLoading(view:WebView,request:WebResourceRequest):Boolean = request.isForMainFrame && !allowed(request.url.toString())
            @Suppress("DEPRECATION")
            override fun shouldOverrideUrlLoading(view:WebView,url:String):Boolean = !allowed(url)
            override fun onReceivedSslError(view:WebView,handler:SslErrorHandler,error:android.net.http.SslError) { handler.cancel() }
            override fun onRenderProcessGone(view:WebView,detail:RenderProcessGoneDetail):Boolean { closeSession(); return true }
        }
        browser.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view:WebView,callback:ValueCallback<Array<Uri>>,params:FileChooserParams):Boolean {
                val activity=browserContext.baseContext as? Activity
                val file=prepared
                val uri=Uri.parse(view.url?:"")
                if(activity==null||file==null||!file.isFile||!allowed(uri.toString())||!uri.path.orEmpty().contains("compensation-gd")){
                    callback.onReceiveValue(null);return true
                }
                fun attachPreparedFile(){
                    val attachmentUri=FileProvider.getUriForFile(this@CemigBrowserService,"$packageName.cemig.preview.files",file)
                    permittedAttachmentUri=attachmentUri
                    view.settings.allowContentAccess=true
                    attachmentConfirmed=true
                    callback.onReceiveValue(arrayOf(attachmentUri))
                }
                // Production starts with an in-app review of this exact CSV.
                // Never open storage or substitute a different file here.
                if(!packageName.endsWith(".preview")){
                    attachPreparedFile();return true
                }
                AlertDialog.Builder(activity).setTitle(if(packageName.endsWith(".preview")) "Anexar CSV da simulação?" else "Anexar CSV do rateio real?")
                    .setMessage("$artifactLabel\n${file.name}\n"+if(packageName.endsWith(".preview")) "O arquivo será enviado ao portal Cemig para revisão. Não conclua Solicitar cadastro neste teste." else "Confira a usina, competência, UCs e percentuais antes de concluir a solicitação. Anexar não confirma protocolo.")
                    .setNegativeButton("Cancelar"){_,_->callback.onReceiveValue(null)}
                    .setOnCancelListener { callback.onReceiveValue(null) }
                    .setPositiveButton("Anexar para revisão"){_,_->
                        attachPreparedFile()
                    }.show()
                return true
            }
            override fun onPermissionRequest(request:PermissionRequest) { request.deny() }
            override fun onGeolocationPermissionsShowPrompt(origin:String,callback:GeolocationPermissions.Callback) { callback.invoke(origin,false,false) }
        }
        // Only the initial main-frame URL is fixed. Subresources retain normal browser loading,
        // so legitimate styles and scripts are not replaced or routed through a proxy.
        browser.loadUrl("https://atende.cemig.com.br/Login")
        handler.postDelayed(expire,10*60*1000L)
        handler.post(navigationTick)
    }
    override fun onBind(intent:Intent):IBinder = binder
    fun attach(activity:Activity):WebView {
        (browser.parent as? ViewGroup)?.removeView(browser)
        browserContext.baseContext=activity
        return browser
    }
    fun detach(activity:Activity) {
        if(browserContext.baseContext===activity) {
            (browser.parent as? ViewGroup)?.removeView(browser)
            browserContext.baseContext=this
        }
    }
    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
        if(intent?.action==STOP)closeSession()
        return START_NOT_STICKY
    }
    private fun closeSession() {
        sendBroadcast(Intent(STOP).setPackage(packageName))
        stopSelf()
    }
    override fun onTaskRemoved(rootIntent:Intent?) { closeSession() }
    override fun onDestroy() {
        closed=true;savedAccess=null;nativeToken=""
        handler.removeCallbacks(expire)
        handler.removeCallbacks(navigationTick)
        prepared?.delete();prepared=null;artifactHash=null
        if(::browser.isInitialized) {
            (browser.parent as? ViewGroup)?.removeView(browser)
            browser.stopLoading()
            browser.destroy()
        }
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }
}
