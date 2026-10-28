package br.com.andradeenergy.cemig

import android.app.Activity
import android.content.*
import android.graphics.Color
import android.os.*
import android.view.ViewGroup
import android.view.View
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
    private lateinit var progressText:TextView
    private val uiHandler=Handler(Looper.getMainLooper())
    private val refreshProgress=object:Runnable{override fun run(){if(::progressText.isInitialized)progressText.text=session?.progress?:"Preparando sessão…";uiHandler.postDelayed(this,1000)}}
    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name:ComponentName,binder:IBinder) {
            session=(binder as CemigBrowserService.LocalBinder).session()
            try {
                val csv=intent.getStringExtra("rateioCsv")
                if(csv!=null){session?.prepare(csv,intent.getStringExtra("rateioCompetencia")?:"",intent.getStringExtra("rateioUsina")?:"");session?.setGeradora(intent.getStringExtra("rateioGeradora")?:"")}
                val api=intent.getStringExtra("rateioApi");val token=intent.getStringExtra("rateioToken")
                if(api!=null&&token!=null)session?.useSavedAccess(api,token,intent.getStringExtra("rateioUsina")?:"")
                if(intent.getBooleanExtra("rateioSolver",false))session?.allowSolver()
                intent.removeExtra("rateioToken")
            } catch(error:IllegalArgumentException){
                Toast.makeText(this@CemigBrowserActivity,error.message?:"CSV inválido",Toast.LENGTH_LONG).show();finish();return
            }
            session?.attach(this@CemigBrowserActivity)?.let { web ->
                content.addView(web,LinearLayout.LayoutParams(-1,0,1f))
            }
        }
        override fun onServiceDisconnected(name:ComponentName) { session=null; finish() }
    }
    override fun onCreate(state:Bundle?) {
        super.onCreate(state)
        window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        if(Build.VERSION.SDK_INT>=33)registerReceiver(closeReceiver,IntentFilter(CemigBrowserService.STOP),Context.RECEIVER_NOT_EXPORTED)
        else @Suppress("DEPRECATION") registerReceiver(closeReceiver,IntentFilter(CemigBrowserService.STOP))
        listening=true
        window.statusBarColor=Color.rgb(0,105,70)
        window.navigationBarColor=Color.WHITE
        if(Build.VERSION.SDK_INT>=26) {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility=window.decorView.systemUiVisibility or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        }
        content=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setBackgroundColor(Color.WHITE) }
        if(Build.VERSION.SDK_INT>=30) {
            window.setDecorFitsSystemWindows(false)
            content.setOnApplyWindowInsetsListener { view,insets ->
                val safe=insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime())
                view.setPadding(safe.left,safe.top,safe.right,safe.bottom)
                if(insets.isVisible(WindowInsets.Type.ime())) {
                    session?.browser?.postDelayed({session?.browser?.evaluateJavascript("document.activeElement&&document.activeElement.scrollIntoView({block:'center',behavior:'smooth'});",null)},250)
                }
                insets
            }
        }
        val toolbar=LinearLayout(this).apply { orientation=LinearLayout.HORIZONTAL; setBackgroundColor(Color.rgb(0,105,70));setPadding(dp(8),0,dp(8),0) }
        val title=TextView(this).apply { text=if(packageName.endsWith(".preview")) "Cemig · Preview" else "Cemig · Rateio";setTextColor(Color.WHITE);textSize=14f;setPadding(dp(8),0,dp(8),0);gravity=android.view.Gravity.CENTER_VERTICAL }
        toolbar.addView(title,LinearLayout.LayoutParams(0,dp(48),1f))
        val options=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL;visibility=View.GONE }
        val menu=Button(this).apply { text="Opções";textSize=12f;setOnClickListener{options.visibility=if(options.visibility==View.VISIBLE)View.GONE else View.VISIBLE} }
        toolbar.addView(menu,LinearLayout.LayoutParams(dp(96),dp(48)))
        content.addView(toolbar)
        progressText=TextView(this).apply{setPadding(dp(12),dp(6),dp(12),dp(6));setTextColor(Color.rgb(0,80,55));textSize=12f}
        options.addView(progressText)
        options.addView(Button(this).apply{text="Continuar até a revisão";setOnClickListener{session?.continueNavigation();options.visibility=View.GONE}})
        options.addView(Button(this).apply{
            text="Resolver verificação nesta sessão"
            setOnClickListener{
                android.app.AlertDialog.Builder(this@CemigBrowserActivity)
                    .setTitle("Uma verificação automática")
                    .setMessage("Usar uma única tentativa com o bônus CapMonster existente? Apenas a URL e os dados técnicos do reCAPTCHA serão enviados. Sem compra, recarga ou protocolo.")
                    .setNegativeButton("Cancelar",null)
                    .setPositiveButton("Autorizar tentativa"){_,_->session?.allowSolver();options.visibility=View.GONE}
                    .show()
            }
        })
        uiHandler.post(refreshProgress)
        val bar=LinearLayout(this)
        fun button(label:String,action:()->Unit) {
            bar.addView(Button(this).apply { text=label;textSize=12f;setOnClickListener { action();options.visibility=View.GONE } },LinearLayout.LayoutParams(0,dp(48),1f))
        }
        button("Voltar") { session?.browser?.let { if(it.canGoBack())it.goBack() else finish() } }
        button("Recarregar") { session?.browser?.reload() }
        button("Encerrar") { stopService(Intent(this,CemigBrowserService::class.java));finish() }
        val zoom=LinearLayout(this)
        zoom.addView(Button(this).apply{text="Reduzir página";textSize=12f;setOnClickListener{session?.browser?.zoomOut();options.visibility=View.GONE}},LinearLayout.LayoutParams(0,dp(48),1f))
        zoom.addView(Button(this).apply{text="Ampliar página";textSize=12f;setOnClickListener{session?.browser?.zoomIn();options.visibility=View.GONE}},LinearLayout.LayoutParams(0,dp(48),1f))
        options.addView(zoom)
        options.addView(bar)
        content.addView(options)
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
    override fun onNewIntent(newIntent:Intent) {
        super.onNewIntent(newIntent)
        val csv=newIntent.getStringExtra("rateioCsv")?:return
        try {
            session?.prepare(csv,newIntent.getStringExtra("rateioCompetencia")?:"",newIntent.getStringExtra("rateioUsina")?:"")
            session?.setGeradora(newIntent.getStringExtra("rateioGeradora")?:"")
            setIntent(newIntent)
        }catch(error:IllegalArgumentException){Toast.makeText(this,error.message,Toast.LENGTH_LONG).show()}
    }
    override fun onDestroy() {
        uiHandler.removeCallbacks(refreshProgress)
        session?.detach(this)
        if(bound)unbindService(connection)
        if(listening)unregisterReceiver(closeReceiver)
        super.onDestroy()
    }
}
