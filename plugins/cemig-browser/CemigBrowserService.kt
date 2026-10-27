package br.com.andradeenergy.cemig

import android.app.*
import android.content.*
import android.graphics.Color
import android.net.Uri
import android.os.*
import android.view.ViewGroup
import android.webkit.*

/** Preview browser session. No submission automation, credential bridge or CAPTCHA bypass. */
class CemigBrowserService : Service() {
    inner class LocalBinder : Binder() { fun session() = this@CemigBrowserService }
    private val binder = LocalBinder()
    private val handler = Handler(Looper.getMainLooper())
    private val expire = Runnable { closeSession() }
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
        browser = WebView(android.view.ContextThemeWrapper(this,android.R.style.Theme_Material_Light_NoActionBar))
        browser.setBackgroundColor(Color.WHITE)
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
            override fun shouldOverrideUrlLoading(view:WebView,request:WebResourceRequest):Boolean = request.isForMainFrame && !allowed(request.url.toString())
            @Suppress("DEPRECATION")
            override fun shouldOverrideUrlLoading(view:WebView,url:String):Boolean = !allowed(url)
            override fun onReceivedSslError(view:WebView,handler:SslErrorHandler,error:android.net.http.SslError) { handler.cancel() }
            override fun onRenderProcessGone(view:WebView,detail:RenderProcessGoneDetail):Boolean { closeSession(); return true }
        }
        browser.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request:PermissionRequest) { request.deny() }
            override fun onGeolocationPermissionsShowPrompt(origin:String,callback:GeolocationPermissions.Callback) { callback.invoke(origin,false,false) }
        }
        // Only the initial main-frame URL is fixed. Subresources retain normal browser loading,
        // so legitimate styles and scripts are not replaced or routed through a proxy.
        browser.loadUrl("https://atende.cemig.com.br/Login")
        handler.postDelayed(expire,10*60*1000L)
    }
    override fun onBind(intent:Intent):IBinder = binder
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
        handler.removeCallbacks(expire)
        if(::browser.isInitialized) {
            (browser.parent as? ViewGroup)?.removeView(browser)
            browser.stopLoading()
            browser.destroy()
        }
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }
}
