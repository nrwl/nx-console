package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.jcef.*
import com.intellij.util.messages.MessageBusConnection
import dev.nx.console.utils.jcef.CustomSchemeHandlerFactory
import javax.swing.JComponent
import kotlinx.serialization.json.Json
import org.cef.CefApp
import org.cef.browser.CefBrowser
import org.cef.handler.CefLifeSpanHandlerAdapter

val json = Json {
    classDiscriminator = "type"
    ignoreUnknownKeys = true
    isLenient = true
    coerceInputValues = true // This will use default values for nulls in non-nullable fields
    encodeDefaults = true // This ensures default values are always encoded
}

abstract class NxCloudFixFile(
    name: String,
) : LightVirtualFile(name, NxCloudFixFileType.INSTANCE, "") {

    protected val browser: JBCefBrowser = JBCefBrowser()

    private val connection: MessageBusConnection

    val lifeSpanHandler: CefLifeSpanHandlerAdapter =
        object : CefLifeSpanHandlerAdapter() {
            override fun onAfterCreated(browser: CefBrowser) {
                val domainName = "nxcloudfix"
                CefApp.getInstance()
                    .registerSchemeHandlerFactory("http", domainName, CustomSchemeHandlerFactory())
            }
        }

    init {
        isWritable = false
        connection = ApplicationManager.getApplication().messageBus.connect()
        connection.subscribe(
            FileEditorManagerListener.FILE_EDITOR_MANAGER,
            object : FileEditorManagerListener {
                override fun fileClosed(source: FileEditorManager, file: VirtualFile) {
                    if (file == this@NxCloudFixFile) {
                        connection.disconnect()
                        browser.jbCefClient.removeLifeSpanHandler(
                            lifeSpanHandler,
                            browser.cefBrowser
                        )
                        Disposer.dispose(browser)
                    }
                }
            }
        )
        browser.jbCefClient.addLifeSpanHandler(lifeSpanHandler, browser.cefBrowser)
    }

    abstract fun createMainComponent(project: Project): JComponent

    abstract fun showFixDetails(details: NxCloudFixDetails): Unit

    override fun hashCode(): Int = name.hashCode()
}
