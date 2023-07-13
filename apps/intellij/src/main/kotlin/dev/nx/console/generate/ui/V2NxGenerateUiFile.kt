package dev.nx.console.generate.ui

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.models.NxGenerator
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.utils.jcef.CustomSchemeHandlerFactory
import dev.nx.console.utils.jcef.OpenDevToolsContextMenuHandler
import dev.nx.console.utils.jcef.getHexColor
import dev.nx.console.utils.jcef.onBrowserLoadEnd
import java.awt.datatransfer.StringSelection
import javax.swing.JComponent
import javax.swing.UIManager
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import org.cef.CefApp

class V2NxGenerateUiFile(name: String, project: Project) : NxGenerateUiFile(name) {

    private val browser: JBCefBrowser = JBCefBrowser()
    private var generatorToDisplay: GeneratorSchema? = null
    private val runGeneratorManager: RunGeneratorManager

    init {
        runGeneratorManager = RunGeneratorManager(project)
    }
    override fun createMainComponent(project: Project): JComponent {
        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 100)
        browser.setPageBackgroundColor(getHexColor(UIUtil.getPanelBackground()))
        registerAppSchemeHandler()
        browser.loadURL("http://nxconsolev2/index.html")
        browser.jbCefClient.addContextMenuHandler(
            OpenDevToolsContextMenuHandler(),
            browser.cefBrowser
        )
        Disposer.register(project, browser)

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

            postMessageToBrowser(GenerateUiStylesInputMessage(this.extractIntellijStyles()))
            postMessageToBrowser(
                GenerateUiConfigurationInputMessage(
                    GenerateUiConfiguration(
                        NxConsoleSettingsProvider.getInstance().enableDryRunOnGenerateChange
                    )
                )
            )

            // we will send this info to the webview once it's initialized
            generator.options?.let {
                this.generatorToDisplay =
                    GeneratorSchema(
                        generatorName = generator.data.name,
                        collectionName = generator.data.collection,
                        description = generator.data.description,
                        options = generator.options,
                        context = generator.contextValues
                    )
            }
            browser.component.requestFocus()
            //            browser.openDevtools()
        }
    }

    private fun handleMessageFromBrowser(message: String) {
        val logger = logger<DefaultNxGenerateUiFile>()
        val messageParsed = json.decodeFromString<GenerateUiOutputMessage>(message)
        logger.info("received message $messageParsed")
        if (messageParsed.payloadType == "output-init") {
            this.generatorToDisplay?.let {
                this.postMessageToBrowser(GenerateUiGeneratorSchemaInputMessage(it))
            }
            return
        }
        if (messageParsed.payloadType == "run-generator") {
            if (messageParsed is GenerateUiRunGeneratorOutputMessage) {
                runGeneratorManager.queueGeneratorToBeRun(
                    messageParsed.payload.positional,
                    messageParsed.payload.flags
                )
            }
        }
        if (messageParsed.payloadType == "request-validation") {
            this.postMessageToBrowser(GenerateUiValidationResultsInputMessage(mapOf()))
        }
        if (messageParsed.payloadType == "copy-to-clipboard") {
            if (messageParsed is GenerateUiCopyToClipboardOutputMessage) {
                CopyPasteManager.getInstance().setContents(StringSelection(messageParsed.payload))
            }
        }
    }

    private fun postMessageToBrowser(message: GenerateUiInputMessage) {
        val messageString = json.encodeToString(message)
        logger<NxGenerateUiFile>().info("posting message $messageString")
        browser.executeJavaScriptAsync("""window.intellijApi.postToWebview($messageString)""")
    }

    private fun registerAppSchemeHandler(): Unit {
        CefApp.getInstance()
            .registerSchemeHandlerFactory(
                "http",
                "nxconsolev2",
                CustomSchemeHandlerFactory(v2 = true)
            )
    }

    private fun extractIntellijStyles(): GenerateUiStyles {
        val backgroundColor = getHexColor(UIUtil.getPanelBackground())
        val foregroundColor =
            getHexColor(
                when (UIUtil.isUnderDarcula()) {
                    true -> UIUtil.getActiveTextColor()
                    false -> UIUtil.getLabelForeground()
                }
            )
        val primaryColor = getHexColor(UIManager.getColor("Button.default.endBackground"))
        val errorColor = getHexColor(UIManager.getColor("Component.errorFocusColor"))
        val fieldBackgroundColor = getHexColor(UIManager.getColor("TextField.background"))
        val fieldBorderColor = getHexColor(UIManager.getColor("Component.borderColor"))
        val selectFieldBackgroundColor =
            getHexColor(UIManager.getColor("ComboBox.nonEditableBackground"))
        val activeSelectionBackgroundColor =
            getHexColor(UIManager.getColor("ComboBox.selectionBackground"))
        val focusBorderColor = getHexColor(UIManager.getColor("Component.focusColor"))
        val badgeBackgroundColor = selectFieldBackgroundColor
        val bannerWarningBackgroundColor =
            getHexColor(UIManager.getColor("Component.warningFocusColor"))
        val statusBarBorderColor = getHexColor(UIManager.getColor("StatusBar.borderColor"))
        val fieldNavHoverColor = getHexColor(UIManager.getColor("TabbedPane.hoverColor"))
        val fontFamily =
            "'${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif;"
        val fontSize = "${UIUtil.getLabelFont().size}px"

        return GenerateUiStyles(
            backgroundColor = backgroundColor,
            foregroundColor = foregroundColor,
            primaryColor = primaryColor,
            errorColor = errorColor,
            fieldBackgroundColor = fieldBackgroundColor,
            fieldBorderColor = fieldBorderColor,
            selectFieldBackgroundColor = selectFieldBackgroundColor,
            activeSelectionBackgroundColor = activeSelectionBackgroundColor,
            focusBorderColor = focusBorderColor,
            badgeBackgroundColor = badgeBackgroundColor,
            bannerWarningBackgroundColor = bannerWarningBackgroundColor,
            separatorColor = statusBarBorderColor,
            fieldNavHoverColor = fieldNavHoverColor,
            fontFamily = fontFamily,
            fontSize = fontSize
        )
        //        val secondaryTextColor = getHexColor(UIUtil.getLabelForeground())
    }
}
