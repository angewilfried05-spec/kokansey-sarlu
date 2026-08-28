package com.kokansey.webview

import android.annotation.SuppressLint
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var offlineContainer: LinearLayout
    private lateinit var retryButton: Button
    private var hasLoadedAtLeastOnce = false
    private lateinit var baseUrl: String

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        offlineContainer = findViewById(R.id.offlineContainer)
        retryButton = findViewById(R.id.retryButton)

        baseUrl = BuildConfig.BASE_URL.trim()
        if (baseUrl.isEmpty()) {
            showFatalDialog("BASE_URL est vide. Configure-le dans app/build.gradle.kts (buildConfigField).")
            return
        }

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.setSupportZoom(false)

        webView.overScrollMode = View.OVER_SCROLL_NEVER
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                val baseHost = try { Uri.parse(baseUrl).host } catch (_: Exception) { null }
                val targetHost = try { Uri.parse(url).host } catch (_: Exception) { null }
                return if (baseHost != null && targetHost != null && baseHost != targetHost) {
                    true
                } else {
                    false
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (url.isNullOrBlank()) return
                if (url.startsWith("about:blank")) return
                hasLoadedAtLeastOnce = true
                hideOffline()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    showOffline()
                }
            }
        }

        retryButton.setOnClickListener {
            tryLoadBaseUrl(forceFromNetwork = true)
        }

        tryLoadBaseUrl(forceFromNetwork = false)
    }

    override fun onResume() {
        super.onResume()
        if (isNetworkAvailable()) {
            if (offlineContainer.visibility == View.VISIBLE || !hasLoadedAtLeastOnce) {
                tryLoadBaseUrl(forceFromNetwork = true)
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }

    private fun showFatalDialog(msg: String) {
        AlertDialog.Builder(this)
            .setTitle("Configuration requise")
            .setMessage(msg)
            .setPositiveButton("OK") { _, _ -> finish() }
            .setCancelable(false)
            .show()
    }

    private fun tryLoadBaseUrl(forceFromNetwork: Boolean) {
        val online = isNetworkAvailable()
        val settings = webView.settings
        settings.cacheMode = when {
            forceFromNetwork && online -> WebSettings.LOAD_DEFAULT
            online -> WebSettings.LOAD_DEFAULT
            else -> WebSettings.LOAD_CACHE_ELSE_NETWORK
        }

        if (!online && !hasLoadedAtLeastOnce) {
            showOffline()
        }

        webView.loadUrl(baseUrl)
    }

    private fun showOffline() {
        offlineContainer.visibility = View.VISIBLE
    }

    private fun hideOffline() {
        offlineContainer.visibility = View.GONE
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
}
