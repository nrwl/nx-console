package dev.nx.console.generate.ui.file

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.jcef.*
import com.intellij.util.messages.MessageBusConnection
import dev.nx.console.NxIcons
import dev.nx.console.generate.ui.*
import dev.nx.console.models.NxGenerator
import dev.nx.console.utils.jcef.ClasspathResourceRequestHandler
import javax.swing.Icon
import javax.swing.JComponent
import kotlinx.serialization.json.Json
import org.cef.browser.CefBrowser
import org.cef.handler.CefLifeSpanHandlerAdapter

val json = Json {
    classDiscriminator = "payloadType"
    ignoreUnknownKeys = true
    isLenient = true
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

abstract class NxGenerateUiFile(name: String) :
    LightVirtualFile(name, NxGenerateUiFileType.INSTANCE, "") {

    protected val browser: JBCefBrowser = JBCefBrowser()

    private val connection: MessageBusConnection

    private val requestHandler =
        ClasspathResourceRequestHandler("http", "nxconsolev2", "generate_ui_v2", browser)

    private val lifeSpanHandler: CefLifeSpanHandlerAdapter =
        object : CefLifeSpanHandlerAdapter() {
            override fun onAfterCreated(browser: CefBrowser) {
                browser.loadURL("http://nxconsolev2/index.html")
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
                        browser.jbCefClient.removeRequestHandler(requestHandler, browser.cefBrowser)
                        browser.jbCefClient.removeLifeSpanHandler(
                            lifeSpanHandler,
                            browser.cefBrowser,
                        )
                        Disposer.dispose(browser)
                    }
                }
            },
        )
        browser.jbCefClient.addRequestHandler(requestHandler, browser.cefBrowser)
        browser.jbCefClient.addLifeSpanHandler(lifeSpanHandler, browser.cefBrowser)
    }

    abstract fun createMainComponent(project: Project): JComponent

    abstract fun setupGeneratorForm(generator: NxGenerator): Unit

    override fun hashCode(): Int = name.hashCode()
}
