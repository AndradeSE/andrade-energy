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

/** A bounded, user-started session. Final submission is never inferred from an upload. */
class CemigBrowserService : Service() {
    inner class LocalBinder : Binder() { fun session() = this@CemigBrowserService }
    private val binder = LocalBinder()
    private val handler = Handler(Looper.getMainLooper())
    private val browserContext by lazy { MutableContextWrapper(this) }
    private val expire = Runnable { notifyAttention("A sessão atingiu o limite de dez minutos. Abra o app para conferir o rateio; nenhum novo envio será iniciado automaticamente.",false);closeSession() }
    private var prepared:File?=null
    private var artifactHash:String?=null
    private var artifactLabel=""
    private var attachmentConfirmed=false
    private var permittedAttachmentUri:Uri?=null
    private var geradora=""
    private var autoleituraPreview: JSONObject? = null
    private var autoleituraPreenchida = false

    fun prepareAutoleituraPreview(raw: String) {
        require(prepared == null && geradora.isEmpty()) {
            "Encerre a sessão de rateio antes de abrir a autoleitura."
        }
        val leitura = try { JSONObject(raw) } catch (_: Exception) {
            throw IllegalArgumentException("Dados de autoleitura inválidos.")
        }
        require(leitura.optString("uc").matches(Regex("[0-9]{6,20}")) &&
            leitura.optString("leitura").matches(Regex("[0-9]{1,9}"))) {
            "Dados de autoleitura inválidos."
        }
        val preview = packageName.endsWith(".preview")
        if (!preview) {
            val id = Regex("[a-fA-F0-9-]{36}")
            require(id.matches(leitura.optString("unidadeId")) && id.matches(leitura.optString("leituraId")))
        }
        leitura.put("somenteConferencia", preview)
        require(autoleituraPreview == null || autoleituraPreview.toString() == leitura.toString()) {
            "Encerre a sessão antes de trocar a leitura."
        }
        autoleituraPreview = leitura
    }

    private var etapaEnvio = "PREPARAR"
    private var comprovanteAte = 0L

    private fun autoleituraApi(leitura: JSONObject, acao: String, dados: JSONObject, concluido: (Boolean) -> Unit) {
        val base = nativeBase
        val token = nativeToken
        val unidade = leitura.getString("unidadeId")
        val id = leitura.getString("leituraId")
        evaluating = true
        Thread {
            val ok = runCatching {
                CemigNativeAccess.validateBase(base, false)
                require(token.isNotBlank())
                val url = java.net.URL("$base/clientes/unidade/$unidade/autoleitura/$id/$acao")
                val conexao = url.openConnection() as javax.net.ssl.HttpsURLConnection
                try {
                    conexao.instanceFollowRedirects = false
                    conexao.connectTimeout = 15000
                    conexao.readTimeout = 15000
                    conexao.requestMethod = "POST"
                    conexao.setRequestProperty("Authorization", "Bearer $token")
                    conexao.setRequestProperty("Content-Type", "application/json")
                    conexao.doOutput = true
                    conexao.outputStream.use { it.write(dados.toString().toByteArray(Charsets.UTF_8)) }
                    conexao.responseCode == 200
                } finally {
                    conexao.disconnect()
                }
            }.getOrDefault(false)
            handler.post {
                evaluating = false
                if (!closed) concluido(ok)
            }
        }.start()
    }

    private fun inspecionarEnvioAutoleitura(leitura: JSONObject) {
        if (etapaEnvio == "ENCERRADO") return
        val asset = when (etapaEnvio) {
            "PREPARAR" -> "preencher"
            "REVISAR", "CONFIRMAR" -> "confirmar"
            else -> "retorno"
        }
        val config = JSONObject(leitura.toString())
            .put("abrirRevisao", true)
            .put("envioReservado", etapaEnvio == "CONFIRMAR")
        val script = assets.open("cemig-autoleitura-$asset.js").bufferedReader().use { it.readText() }
            .replace("__ANDRADE_CONFIG__", config.toString())
        evaluating = true
        browser.evaluateJavascript(script) { raw ->
            evaluating = false
            if (closed) return@evaluateJavascript
            when (etapaEnvio) {
                "PREPARAR" -> {
                    if (raw?.trim('"') == "AGUARDANDO_CONFIRMACAO") etapaEnvio = "REVISAR"
                    progress = "Confira se a UC selecionada e o período correspondem à leitura."
                }
                "REVISAR" -> if (raw?.trim('"') == "AGUARDANDO_RESERVA") {
                    autoleituraApi(leitura, "reservar", JSONObject().put("leitura", leitura.getInt("leitura"))) { ok ->
                        etapaEnvio = if (ok) "CONFIRMAR" else "ENCERRADO"
                        progress = if (ok) "Envio reservado." else "Confira o estado da leitura antes de tentar novamente."
                    }
                }
                "CONFIRMAR" -> if (raw?.trim('"') == "AGUARDANDO_RETORNO") {
                    etapaEnvio = "RETORNO"
                    comprovanteAte = SystemClock.elapsedRealtime() + 45000L
                    progress = "Aguardando comprovante da Cemig."
                }
                "RETORNO" -> {
                    val retorno = runCatching { JSONObject(raw.orEmpty()) }.getOrNull()
                    if (retorno?.optString("estado") != "ENVIADA" &&
                        SystemClock.elapsedRealtime() >= comprovanteAte) {
                        etapaEnvio = "ENCERRADO"
                        autoleituraApi(leitura, "retorno", JSONObject().put("estado", "EM_REVISAO")) { ok ->
                            progress = if (ok) "A Cemig não apresentou comprovante. Envio encaminhado para revisão."
                                else "Retorno indisponível. Confira a leitura no portal antes de tentar novamente."
                        }
                        return@evaluateJavascript
                    }
                    if (retorno?.optString("estado") == "ENVIADA") {
                        etapaEnvio = "ENCERRADO"
                        autoleituraApi(leitura, "retorno", retorno) { ok ->
                            val protocolo = retorno.optString("protocolo")
                            progress = if (ok) "Protocolo registrado: $protocolo"
                                else "Cemig confirmou o protocolo $protocolo. Confira o registro no aplicativo."
                        }
                    }
                }
            }
        }
    }

    private fun inspectAutoleituraPreview(leitura: JSONObject) {
        if (!leitura.optBoolean("somenteConferencia")) {
            inspecionarEnvioAutoleitura(leitura)
            return
        }
        if (autoleituraPreenchida) return
        val script = assets.open("cemig-autoleitura-preencher.js").bufferedReader().use { it.readText() }
            .replace("__ANDRADE_CONFIG__", leitura.toString())
        evaluating = true
        val retorno = assets.open("cemig-autoleitura-retorno.js").bufferedReader().use { it.readText() }
            .replace("__ANDRADE_CONFIG__", leitura.toString())
        val conferir = "(function(){const recibo = " + retorno.trim().removeSuffix(";") +
            ";return recibo.estado === 'AGUARDANDO' ? { etapa: " +
            script.trim().removeSuffix(";") + " } : recibo;})();"
        browser.evaluateJavascript(conferir) { raw ->
            evaluating = false
            val resultado = runCatching { JSONObject(raw.orEmpty()) }.getOrNull()
            when (resultado?.optString("estado")) {
                "ENVIADA" -> {
                    autoleituraPreenchida = true
                    progress = "Já existe um comprovante para esta UC e competência. Confira se ele corresponde à leitura da fila. Protocolo: " + resultado.optString("protocolo")
                    return@evaluateJavascript
                }
                "EM_REVISAO" -> {
                    progress = "Confira o comprovante da Cemig antes de continuar."
                    return@evaluateJavascript
                }
            }
            val state = resultado?.optString("etapa")
            autoleituraPreenchida = state == "LEITURA_PREENCHIDA"
            progress = when (state) {
                "LEITURA_PREENCHIDA" -> "Leitura preenchida para conferência. A automação não avançou."
                "FORA_DO_SERVICO" -> "Entre na Cemig e abra Informar leitura atual."
                "UC_NAO_CONFIRMADA" -> "Confira se a unidade selecionada na Cemig corresponde à leitura."
                "FORMULARIO_NAO_CONFIRMADO" -> "Aguardando o formulário de leitura atual."
                else -> "A leitura não foi preenchida. Confira o período, o mês e o valor no portal."
            }
        }
    }
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
    private var lastAttentionNotice=""
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
    fun setGeradora(value:String){require(autoleituraPreview == null){"Encerre a sessão de autoleitura antes de abrir o rateio."};require(value.matches(Regex("\\d{6,20}"))){"UC geradora inválida."};require(geradora.isEmpty()||geradora==value){"A UC da sessão não pode ser trocada."};geradora=value}
    fun continueNavigation(){navigationStarted=true;browser.evaluateJavascript("window.__andradeLastStep=null;",null);inspectNavigation()}
    private fun inspectNavigation(){
        if(!::browser.isInitialized||evaluating||!allowed(browser.url?:""))return
        autoleituraPreview?.let {
            val page = Uri.parse(browser.url ?: "")
            if (page.path == "/portal/services/inform-reading") {
                inspectAutoleituraPreview(it)
                return
            }
            if (page.host in setOf("www.atendimento.cemig.com.br", "atendimento.cemig.com.br")
                && page.path == "/portal/home") {
                evaluating = true
                browser.evaluateJavascript(
                    "(function(){return /minhas unidades consumidoras/i.test(document.body?.innerText || '');})();"
                ) { authenticated ->
                    evaluating = false
                    if (authenticated == "true" && !closed) {
                        savedAccess = null
                        browser.loadUrl("https://www.atendimento.cemig.com.br/portal/services/inform-reading")
                    }
                }
                return
            }
            // Continue through the shared login and CAPTCHA states. Without a
            // generating UC, the rateio script stops before entering its service.
        }
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
            if(browserContext.baseContext !is Activity &&
                (progress.contains("verificação de segurança")||progress.contains("Continue manualmente")||progress.contains("revisão")||progress.contains("recusou")))notifyAttention(progress)
        }
    }
    private fun notifyAttention(message:String,sessionActive:Boolean=true) {
        if(message==lastAttentionNotice)return
        lastAttentionNotice=message
        val destination=if(sessionActive)Intent(this,CemigBrowserActivity::class.java) else packageManager.getLaunchIntentForPackage(packageName)?:return
        val open=PendingIntent.getActivity(this,if(sessionActive)2 else 3,destination,PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification=Notification.Builder(this,CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle("Rateio Cemig · confira a sessão")
            .setContentText(message).setStyle(Notification.BigTextStyle().bigText(message))
            .setContentIntent(open).setAutoCancel(true).build()
        getSystemService(NotificationManager::class.java).notify(NOTICE+1,notification)
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
        require(autoleituraPreview == null) { "Encerre a sessão de autoleitura antes de abrir o rateio." }
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
            .setContentText("Sessão em andamento por até 10 minutos. Toque para acompanhar ou encerrar.")
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
                if(file==null||!file.isFile||!allowed(uri.toString())||!uri.path.orEmpty().contains("compensation-gd")){
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
                // Preview upload still needs the user's visible review. Preserve the session
                // while detached instead of attempting an Activity-only dialog in background.
                if(activity==null){progress="Volte à sessão para conferir o anexo de teste.";callback.onReceiveValue(null);return true}
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
    // Removing the Activity from recents must not silently cancel an already started
    // foreground session. Explicit stop, process death and the bounded timeout still apply.
    override fun onTaskRemoved(rootIntent:Intent?) { super.onTaskRemoved(rootIntent) }
    override fun onTimeout(startId:Int,fgsType:Int) { closeSession() }
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
