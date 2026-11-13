package br.com.andradeenergy.share

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import java.io.File
import java.util.UUID

class ShareInboxActivity : Activity() {
  override fun onCreate(state: Bundle?) {
    super.onCreate(state)
    val incoming = intent
    Thread {
      var pending: File? = null
      try {
        require(incoming.action == Intent.ACTION_SEND)
        val uri = requireNotNull(incoming.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))
        require(uri.scheme == "content")
        val extension = when (contentResolver.getType(uri) ?: incoming.type) {
          "application/pdf" -> "pdf"
          "image/jpeg" -> "jpg"
          "image/png" -> "png"
          else -> error("Formato")
        }
        val folder = File(cacheDir, "shared-invoices").apply { mkdirs() }
        val id = UUID.randomUUID().toString()
        val temp = File(folder, "$id.tmp").also { pending = it }
        requireNotNull(contentResolver.openInputStream(uri)).use { input ->
          temp.outputStream().use { output ->
            val buffer = ByteArray(8192)
            var total = 0L
            while (true) {
              val read = input.read(buffer)
              if (read < 0) break
              total += read
              require(total <= 10L * 1024 * 1024)
              output.write(buffer, 0, read)
            }
            require(total > 0)
          }
        }
        check(temp.renameTo(File(folder, "$id.$extension")))
        runOnUiThread {
          packageManager.getLaunchIntentForPackage(packageName)?.let {
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(it)
          }
          finish()
        }
      } catch (_: Exception) {
        pending?.delete()
        runOnUiThread {
          Toast.makeText(this, "Selecione um PDF, JPG ou PNG de até 10 MB.", Toast.LENGTH_LONG).show()
          finish()
        }
      }
    }.start()
  }
}
