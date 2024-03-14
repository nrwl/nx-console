package dev.nx.console.generate.ui.file

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.jcef.*
import com.intellij.util.messages.MessageBusConnection
import com.intellij.util.ui.UIUtil
import dev.nx.console.NxIcons
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.generate.ui.*
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
                        Disposer.dispose(browser)
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

class DefaultNxGenerateUiFile(name: String, private val runGeneratorManager: RunGeneratorManager) :
    NxGenerateUiFile(name) {

    private var generatorToDisplay: GeneratorSchemaPayload? = null

    override fun createMainComponent(project: Project): JComponent {

        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 10)
        browser.setPageBackgroundColor(getHexColor(UIUtil.getPanelBackground()))

        return browser.component
    }

    override fun setupGeneratorForm(generator: NxGenerator) {
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
                        name = generator.data.name,
                        collection = generator.data.collection,
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
