package dev.nx.console.generate.ui.file

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.jcef.*
import com.intellij.util.messages.MessageBusConnection
import dev.nx.console.NxIcons
import dev.nx.console.generate.ui.*
import dev.nx.console.models.NxGenerator
import dev.nx.console.utils.jcef.CustomSchemeHandlerFactory
import javax.swing.Icon
import javax.swing.JComponent
import kotlinx.serialization.json.Json
import org.cef.CefApp
import org.cef.browser.CefBrowser
import org.cef.handler.CefLifeSpanHandlerAdapter

val json = Json {
    classDiscriminator = "payloadType"
    ignoreUnknownKeys = true
}

class NxGenerateUiFileType : FileType {
    override fun getName(): String = "NxGenerateUi"
    override fun getDescription(): String = ""
    override fun getDefaultExtension(): String = ".nx"

    override fun getIcon(): Icon = NxIcons.FileType
    override fun isBinary(): Boolean = true
    override fun isReadOnly(): Boolean = true
    override fun getCharset(file: VirtualFile, content: ByteArray): String? = null

    companion object {
        val INSTANCE = NxGenerateUiFileType()
    }
}

abstract class NxGenerateUiFile(name: String, v2: Boolean = false) :
    LightVirtualFile(name, NxGenerateUiFileType.INSTANCE, "") {

    protected val browser: JBCefBrowser = JBCefBrowser()

    private val connection: MessageBusConnection

    val lifeSpanHandler: CefLifeSpanHandlerAdapter =
        object : CefLifeSpanHandlerAdapter() {
            override fun onAfterCreated(browser: CefBrowser) {
                val domainName = if (v2) "nxconsolev2" else "nxconsole"
                CefApp.getInstance()
                    .registerSchemeHandlerFactory(
                        "http",
                        domainName,
                        CustomSchemeHandlerFactory(v2)
                    )
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
                    if (file == this@NxGenerateUiFile) {
                        connection.disconnect()
                        browser.jbCefClient.removeLifeSpanHandler(
                            lifeSpanHandler,
                            browser.cefBrowser
                        )
                        browser.dispose()
                    }
                }
            }
        )
        browser.jbCefClient.addLifeSpanHandler(lifeSpanHandler, browser.cefBrowser)
    }

    abstract fun createMainComponent(project: Project): JComponent

    abstract fun setupGeneratorForm(generator: NxGenerator): Unit

    override fun hashCode(): Int = name.hashCode()
}
