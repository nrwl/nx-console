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
    classDiscriminator = "payloadType"
    ignoreUnknownKeys = true
    isLenient = true
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
                browser.loadURL("http://$domainName/index.html")
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

    // Will be implemented in later commits when NxCloudFixDetails is defined
    // abstract fun showFixDetails(details: NxCloudFixDetails): Unit

    override fun hashCode(): Int = name.hashCode()
}