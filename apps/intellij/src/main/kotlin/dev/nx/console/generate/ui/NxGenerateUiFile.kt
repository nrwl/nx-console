package dev.nx.console.generate.ui

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.NxIcons
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.models.NxGenerator
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.utils.jcef.CustomSchemeHandlerFactory
import dev.nx.console.utils.jcef.getHexColor
import dev.nx.console.utils.jcef.onBrowserLoadEnd
import javax.swing.Icon
import javax.swing.JComponent
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.cef.CefApp

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

abstract class NxGenerateUiFile(name: String) :
    LightVirtualFile(name, NxGenerateUiFileType.INSTANCE, "") {
    init {
        isWritable = false
    }

    abstract fun createMainComponent(project: Project): JComponent

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as NxGenerateUiFile

        if (name != other.name) return false

        return true
    }

    override fun hashCode(): Int = name.hashCode()
}

class DefaultNxGenerateUiFile(name: String, project: Project) : NxGenerateUiFile(name) {

    private val browser: JBCefBrowser = JBCefBrowser()
    private var generatorToDisplay: GeneratorSchemaPayload? = null
    private val runGeneratorManager: RunGeneratorManager

    init {
        runGeneratorManager = RunGeneratorManager(project)
    }
    override fun createMainComponent(project: Project): JComponent {

        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 10)
        browser.setPageBackgroundColor(getHexColor(UIUtil.getPanelBackground()))
        registerAppSchemeHandler()
        browser.loadURL("http://nxconsole/index.html")
        Disposer.register(project, browser)

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
            postMessageToBrowser(
                GlobalConfigurationMessage(
                    GlobalConfigurationPayload(
                        NxConsoleSettingsProvider.getInstance().enableDryRunOnGenerateChange
                    )
                )
            )

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
            browser.component.requestFocus()
        }
    }

    private fun handleMessageFromBrowser(message: String) {
        val logger = logger<DefaultNxGenerateUiFile>()
        val messageParsed = json.decodeFromString<TaskExecutionOutputMessage>(message)
        logger.info("received message $messageParsed")
        if (messageParsed.payloadType == "output-init") {
            this.generatorToDisplay?.let { this.postMessageToBrowser(GeneratorSchemaMessage(it)) }
            return
        }
        if (messageParsed.payloadType == "run-command") {
            if (messageParsed is TaskExecutionRunCommandOutputMessage) {
                runGeneratorManager.queueGeneratorToBeRun(
                    messageParsed.payload.positional,
                    messageParsed.payload.flags
                )
            }
        }
    }

    private fun postMessageToBrowser(message: TaskExecutionInputMessage) {
        val messageString = json.encodeToString(message)
        logger<NxGenerateUiFile>().info("posting message $messageString")
        browser.executeJavaScriptAsync("""window.intellijApi.postToWebview($messageString)""")
    }

    private fun registerAppSchemeHandler(): Unit {
        CefApp.getInstance()
            .registerSchemeHandlerFactory("http", "nxconsole", CustomSchemeHandlerFactory())
    }

    private fun extractIntellijStyles(): StylePayload {
        val backgroundColor = getHexColor(UIUtil.getPanelBackground())
        val highlightTextColor =
            getHexColor(
                when (UIUtil.isUnderDarcula()) {
                    true -> UIUtil.getActiveTextColor()
                    false -> UIUtil.getLabelForeground()
                }
            )
        val secondaryTextColor = getHexColor(UIUtil.getLabelForeground())
        val fieldBackground = getHexColor(UIUtil.getTextFieldBackground())
        val fontFamily =
            "'${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;"
        val fontSize = "${UIUtil.getLabelFont().size}px"
        return StylePayload(
            backgroundColor,
            highlightTextColor,
            secondaryTextColor,
            fieldBackground,
            fontFamily,
            fontSize
        )
    }
}
