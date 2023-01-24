package dev.nx.console.generate_ui.editor

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.generate_ui.CustomSchemeHandlerFactory
import dev.nx.console.generate_ui.utils.getHexColor
import dev.nx.console.generate_ui.utils.onBrowserLoadEnd
import dev.nx.console.nxls.server.NxGenerator
import dev.nx.console.nxls.server.NxGeneratorOption
import javax.swing.Icon
import javax.swing.JComponent
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.cef.CefApp

class NxGenerateUiFileType : FileType {
    override fun getName(): String = "NxGenerateUi"
    override fun getDescription(): String = ""
    override fun getDefaultExtension(): String = ".nx"

    // TODO(maxkless): proper icon
    override fun getIcon(): Icon = icons.TasksIcons.Bug
    override fun isBinary(): Boolean = true
    override fun isReadOnly(): Boolean = true
    override fun getCharset(file: VirtualFile, content: ByteArray): String? = null

    companion object {
        val INSTANCE = NxGenerateUiFileType()
    }
}

abstract class NxGenerateUiFile(name: String) :
    LightVirtualFile(name, NxGenerateUiFileType.INSTANCE, "") {
    init {
        isWritable = false
    }

    abstract fun createMainComponent(project: Project): JComponent
}

class DefaultNxGenerateUiFile(name: String) : NxGenerateUiFile(name) {

    private val browser: JBCefBrowser = JBCefBrowser()

    override fun createMainComponent(project: Project): JComponent {

        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 10)
        registerAppSchemeHandler()
        browser.loadURL("http://nxconsole/index.html")
        Disposer.register(project, browser)

        return browser.component
    }

    fun setupGeneratorForm(generator: NxGenerator, options: List<NxGeneratorOption>) {
        onBrowserLoadEnd(browser) {
            val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
            query.addHandler { msg ->
                handleMessageFromBrowser(msg)
                null
            }
            val js =
                """
            window.intellijApi.postToIde = (message) => {
                    ${query.inject("message")}
            }
        """
            browser.executeJavaScriptAsync(js)

            postMessageToBrowser(
                StyleMessage(StylePayload(getHexColor(UIUtil.getPanelBackground())))
            )
            postMessageToBrowser(GeneratorMessage(GeneratorPayload(generator, options)))
        }
    }

    private fun handleMessageFromBrowser(message: String) {
        val logger = logger<DefaultNxGenerateUiFile>()
        logger.info(message)
    }

    private fun postMessageToBrowser(message: Message) {
        val message = Json.encodeToString(message)
        logger<NxGenerateUiFile>().info("posting message $message")
        browser.executeJavaScriptAsync("""window.intellijApi.post($message)""")
    }
    private fun registerAppSchemeHandler(): Unit {
        CefApp.getInstance()
            .registerSchemeHandlerFactory("http", "nxconsole", CustomSchemeHandlerFactory())
    }
}
