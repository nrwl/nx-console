package dev.nx.console.generate_ui.editor

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.NxIcons
import dev.nx.console.generate_ui.CustomSchemeHandlerFactory
import dev.nx.console.generate_ui.run_generator.runGenerator
import dev.nx.console.generate_ui.utils.getHexColor
import dev.nx.console.generate_ui.utils.onBrowserLoadEnd
import dev.nx.console.nxls.server.NxGenerator
import javax.swing.Icon
import javax.swing.JComponent
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.cef.CefApp

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
    init {
        isWritable = false
    }

    abstract fun createMainComponent(project: Project): JComponent
}

class DefaultNxGenerateUiFile(name: String) : NxGenerateUiFile(name) {

    private val browser: JBCefBrowser = JBCefBrowser()
    private var generatorToDisplay: GeneratorSchemaPayload? = null
    private var project: Project? = null
    override fun createMainComponent(project: Project): JComponent {

        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 10)
        registerAppSchemeHandler()
        browser.loadURL("http://nxconsole/index.html")
        Disposer.register(project, browser)

        this.project = project

        return browser.component
    }

    fun setupGeneratorForm(generator: NxGenerator) {
        onBrowserLoadEnd(browser) {
            val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
            query.addHandler { msg ->
                handleMessageFromBrowser(msg)
                null
            }
            val js =
                """
            window.intellijApi.registerPostToIdeCallback((message) => {
                    ${query.inject("message")}
            })
        """
            browser.executeJavaScriptAsync(js)

            postMessageToBrowser(StyleMessage(this.extractIntellijStyles()))
            postMessageToBrowser(GlobalConfigurationMessage(GlobalConfigurationPayload(true)))

            // we will send this info to the webview once it's initialized
            generator.options?.let {
                this.generatorToDisplay =
                    GeneratorSchemaPayload(
                        name = generator.name,
                        description = generator.data.description,
                        options = generator.options,
                        contextValues = generator.contextValues
                    )
            }
        }
    }

    private fun handleMessageFromBrowser(message: String) {
        val logger = logger<DefaultNxGenerateUiFile>()
        val messageParsed =
            Json { ignoreUnknownKeys = true }.decodeFromString<TaskExecutionOutputMessage>(message)
        logger.info("received message $messageParsed")
        if (messageParsed.type == "output-init") {
            this.generatorToDisplay?.let { this.postMessageToBrowser(GeneratorSchemaMessage(it)) }
            return
        }
        if (messageParsed.type == "run-command") {
            if (messageParsed is TaskExecutionRunCommandOutputMessage) {
                this.project?.let {
                    runGenerator(messageParsed.payload.positional, messageParsed.payload.flags, it)
                }
            }
        }
    }

    private fun postMessageToBrowser(message: TaskExecutionInputMessage) {
        val messageString = Json.encodeToString(message)
        logger<NxGenerateUiFile>().info("posting message $messageString")
        browser.executeJavaScriptAsync("""window.intellijApi.postToWebview($messageString)""")
    }

    private fun registerAppSchemeHandler(): Unit {
        CefApp.getInstance()
            .registerSchemeHandlerFactory("http", "nxconsole", CustomSchemeHandlerFactory())
    }

    private fun extractIntellijStyles(): StylePayload {
        val backgroundColor = getHexColor(UIUtil.getPanelBackground())
        val primaryTextColor = getHexColor(UIUtil.getActiveTextColor())
        val secondaryTextColor = getHexColor(UIUtil.getLabelForeground())
        val fieldBackground = getHexColor(UIUtil.getTextFieldBackground())
        return StylePayload(backgroundColor, primaryTextColor, secondaryTextColor, fieldBackground)
    }
}
