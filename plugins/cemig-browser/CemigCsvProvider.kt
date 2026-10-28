package br.com.andradeenergy.cemig

import android.net.Uri
import androidx.core.content.FileProvider

/** Preserve the standard CSV MIME type across Android/WebView versions. */
class CemigCsvProvider : FileProvider() {
    override fun getType(uri: Uri): String? {
        // Resolve through FileProvider first: retain its authority/path validation.
        val original = super.getType(uri)
        return if (uri.lastPathSegment?.endsWith(".csv", ignoreCase = true) == true) "text/csv" else original
    }
}
