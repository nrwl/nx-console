package dev.nx.console.utils.jcef

import java.io.IOException
import java.net.URLConnection
import org.cef.callback.CefCallback
import org.cef.handler.CefLoadHandler
import org.cef.handler.CefResourceHandler
import org.cef.misc.IntRef
import org.cef.misc.StringRef
import org.cef.network.CefRequest
import org.cef.network.CefResponse

const val urlScheme = "http://nxconsole"
const val resourceFolder = "generate_ui"

const val urlSchemeV2 = "http://nxconsolev2"
const val resourceFolderV2 = "generate_ui_v2"

class CustomResourceHandler(private val v2: Boolean = false) : CefResourceHandler {
    private var state: ResourceHandlerState = ClosedConnection
    override fun processRequest(cefRequest: CefRequest?, cefCallback: CefCallback): Boolean {
        val url = cefRequest?.url
        return if (url == null) {
            false
        } else {
            val pathToResource =
                url.replace(
                    if (v2) urlSchemeV2 else urlScheme,
                    if (v2) resourceFolderV2 else resourceFolder
                )
            val newUrl = this.javaClass.classLoader.getResource(pathToResource)
            state = OpenedConnection(newUrl.openConnection())
            cefCallback.Continue()
            true
        }
    }

    override fun getResponseHeaders(
        cefResponse: CefResponse,
        responseLength: IntRef,
        redirectUrl: StringRef
    ) {
        state.getResponseHeaders(cefResponse, responseLength, redirectUrl)
    }

    override fun readResponse(
        dataOut: ByteArray,
        bytesToRead: Int,
        bytesRead: IntRef,
        callback: CefCallback
    ): Boolean {
        return state.readResponse(dataOut, bytesToRead, bytesRead, callback)
    }

    override fun cancel() {
        state.close()
        state = ClosedConnection
    }
}

sealed class ResourceHandlerState {
    abstract fun getResponseHeaders(
        cefResponse: CefResponse,
        responseLength: IntRef,
        redirectUrl: StringRef
    )

    abstract fun readResponse(
        dataOut: ByteArray,
        designedBytesToRead: Int,
        bytesRead: IntRef,
        callback: CefCallback
    ): Boolean

    open fun close() {}
}

class OpenedConnection(private val connection: URLConnection) : ResourceHandlerState() {
    private val inputStream = connection.getInputStream()

    override fun getResponseHeaders(
        cefResponse: CefResponse,
        responseLength: IntRef,
        redirectUrl: StringRef
    ) {
        try {
            val url = connection.url.toString()
            if (url.contains("css")) {
                cefResponse.mimeType = "text/css"
            } else if (url.contains("js")) {
                cefResponse.mimeType = "text/javascript"
            } else if (url.contains("html")) {
                cefResponse.mimeType = "text/html"
            } else if (url.contains("svg")) {
                cefResponse.mimeType = "image/svg+xml"
            } else {
                cefResponse.mimeType = connection.contentType
            }

            responseLength.set(inputStream.available())
            cefResponse.status = 200
        } catch (e: IOException) {
            cefResponse.error = CefLoadHandler.ErrorCode.ERR_FILE_NOT_FOUND
            cefResponse.statusText = e.localizedMessage
            cefResponse.status = 404
        }
    }

    override fun readResponse(
        dataOut: ByteArray,
        designedBytesToRead: Int,
        bytesRead: IntRef,
        callback: CefCallback
    ): Boolean {
        val availableSize = inputStream.available()
        return if (availableSize > 0) {
            val maxBytesToRead = availableSize.coerceAtMost(designedBytesToRead)
            val realNumberOfReadBytes = inputStream.read(dataOut, 0, maxBytesToRead)
            bytesRead.set(realNumberOfReadBytes)
            true
        } else {
            inputStream.close()
            false
        }
    }

    override fun close() {
        inputStream.close()
    }
}

data object ClosedConnection : ResourceHandlerState() {
    override fun getResponseHeaders(
        cefResponse: CefResponse,
        responseLength: IntRef,
        redirectUrl: StringRef
    ) {
        cefResponse.status = 404
    }

    override fun readResponse(
        dataOut: ByteArray,
        designedBytesToRead: Int,
        bytesRead: IntRef,
        callback: CefCallback
    ): Boolean {
        return false
    }
}
