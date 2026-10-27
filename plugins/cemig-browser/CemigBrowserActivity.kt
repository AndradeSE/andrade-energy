package br.com.andradeenergy.cemig

import android.app.Activity
import android.content.*
import android.graphics.Color
import android.os.*
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.*

class CemigBrowserActivity : Activity() {
    private fun dp(value:Int)=(value*resources.displayMetrics.density).toInt()
    private var session:CemigBrowserService? = null
    private var bound = false
    private var listening = false
    private val closeReceiver=object:BroadcastReceiver(){
        override fun onReceive(context:Context,intent:Intent){ finish() }
    }
    private lateinit var content:LinearLayout
    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name:ComponentName,binder:IBinder) {
            session=(binder as CemigBrowserService.LocalBinder).session()
            session?.browser?.let { web ->
                (web.parent as? ViewGroup)?.removeView(web)
                content.addView(web,LinearLayout.LayoutParams(-1,0,1f))
            }
        }
        override fun onServiceDisconnected(name:ComponentName) { session=null; finish() }
    }
    override fun onCreate(state:Bundle?) {
        super.onCreate(state)
        if(Build.VERSION.SDK_INT>=33)registerReceiver(closeReceiver,IntentFilter(CemigBrowserService.STOP),Context.RECEIVER_NOT_EXPORTED)
        else @Suppress("DEPRECATION") registerReceiver(closeReceiver,IntentFilter(CemigBrowserService.STOP))
        listening=true
        window.statusBarColor=Color.rgb(0,105,70)
        window.navigationBarColor=Color.WHITE
        content=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setBackgroundColor(Color.WHITE) }
        if(Build.VERSION.SDK_INT>=30) {
            window.setDecorFitsSystemWindows(false)
            content.setOnApplyWindowInsetsListener { view,insets ->
                val safe=insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime())
                view.setPadding(safe.left,safe.top,safe.right,safe.bottom)
                insets
            }
        }
        val title=TextView(this).apply {
            text="Cemig · teste no aparelho\nSessão de até 10 min. Sem envio automático ou protocolo."
            setPadding(dp(16),dp(12),dp(16),dp(12));setTextColor(Color.rgb(0,80,55))
        }
        content.addView(title)
        val bar=LinearLayout(this)
        fun button(label:String,action:()->Unit) {
            bar.addView(Button(this).apply { text=label;setOnClickListener { action() } },LinearLayout.LayoutParams(0,dp(56),1f))
        }
        button("Voltar") { session?.browser?.let { if(it.canGoBack())it.goBack() else finish() } }
        button("Recarregar") { session?.browser?.reload() }
        button("Encerrar") { stopService(Intent(this,CemigBrowserService::class.java));finish() }
        content.addView(bar)
        setContentView(content)
        try {
            startForegroundService(Intent(this,CemigBrowserService::class.java))
            bound=bindService(Intent(this,CemigBrowserService::class.java),connection,Context.BIND_AUTO_CREATE)
        } catch (_: Exception) {
            Toast.makeText(this,"Não foi possível iniciar a sessão. Tente com o app aberto.",Toast.LENGTH_LONG).show();finish()
        }
    }
    @Deprecated("Android compatibility")
    override fun onBackPressed() { session?.browser?.let { if(it.canGoBack())it.goBack() else finish() } ?: finish() }
    override fun onDestroy() {
        session?.browser?.let { (it.parent as? ViewGroup)?.removeView(it) }
        if(bound)unbindService(connection)
        if(listening)unregisterReceiver(closeReceiver)
        super.onDestroy()
    }
}
