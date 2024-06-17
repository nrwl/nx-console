package dev.nx.console.generate.ui.file

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.Project
import com.intellij.ui.JBColor
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.generate.ui.*
import dev.nx.console.models.NxGenerator
import dev.nx.console.nxls.NxlsService
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.utils.jcef.OpenDevToolsContextMenuHandler
import dev.nx.console.utils.jcef.getHexColor
import dev.nx.console.utils.jcef.onBrowserLoadEnd
import java.awt.datatransfer.StringSelection
import javax.swing.JComponent
import javax.swing.UIManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString

class V2NxGenerateUiFile(
    name: String,
    private val project: Project,
    private val runGeneratorManager: RunGeneratorManager
) : NxGenerateUiFile(name, true) {
    private val cs = V2NxGenerateUiFileCoroutineHolder.getInstance(project).cs

    private var generatorToDisplay: GeneratorSchema? = null

    override fun createMainComponent(project: Project): JComponent {
        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 100)
        browser.setPageBackgroundColor(getHexColor(UIUtil.getPanelBackground()))
        browser.jbCefClient.addContextMenuHandler(
            OpenDevToolsContextMenuHandler(),
            browser.cefBrowser
        )

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
            cs.launch {
                browser.executeJavaScript(js)

                postMessageToBrowser(GenerateUiStylesInputMessage(extractIntellijStyles()))
                postMessageToBrowser(
                    GenerateUiConfigurationInputMessage(
                        GenerateUiConfiguration(
                            NxConsoleSettingsProvider.getInstance().enableDryRunOnGenerateChange
                        )
                    )
                )
            }

            // we will send this info to the webview once it's initialized
            generator.options?.let {
                this.generatorToDisplay =
                    GeneratorSchema(
                        generatorName = generator.data.name,
                        collectionName = generator.data.collection,
                        description = generator.data.description ?: "",
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
            this.generatorToDisplay?.let { schema ->
                cs.launch {
                    NxlsService.getInstance(project).transformedGeneratorSchema(schema).apply {
                        postMessageToBrowser(GenerateUiGeneratorSchemaInputMessage(this))
                    }
                }
                cs.launch {
                    NxlsService.getInstance(project).startupMessage(schema)?.apply {
                        postMessageToBrowser(GenerateUiStartupMessageDefinitionInputMessage(this))
                    }
                }
            }

            return
        }
        if (messageParsed.payloadType == "run-generator") {
            if (messageParsed is GenerateUiRunGeneratorOutputMessage) {
                runGeneratorManager.queueGeneratorToBeRun(
                    messageParsed.payload.positional,
                    messageParsed.payload.flags,
                    messageParsed.payload.cwd
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
        cs.launch {
            browser.executeJavaScript("""window.intellijApi.postToWebview($messageString)""")
        }
    }

    private fun extractIntellijStyles(): GenerateUiStyles {
        val backgroundColor = getHexColor(UIUtil.getPanelBackground())
        val foregroundColor =
            getHexColor(
                when (!JBColor.isBright()) {
                    true -> UIUtil.getActiveTextColor()
                    false -> UIUtil.getLabelForeground()
                }
            )
        val mutedForegroundColor = getHexColor(UIManager.getColor("Component.infoForeground"))
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
        val bannerTextColor = getHexColor(UIManager.getColor("Button.foreground"))
        val statusBarBorderColor = getHexColor(UIManager.getColor("StatusBar.borderColor"))
        val fieldNavHoverColor = getHexColor(UIManager.getColor("TabbedPane.hoverColor"))

        val scrollbarThumbColor = selectFieldBackgroundColor
        val fontFamily =
            "'${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif;"
        val fontSize = "${UIUtil.getLabelFont().size}px"

        return GenerateUiStyles(
            backgroundColor = backgroundColor,
            foregroundColor = foregroundColor,
            mutedForegroundColor = mutedForegroundColor,
            primaryColor = primaryColor,
            errorColor = errorColor,
            fieldBackgroundColor = fieldBackgroundColor,
            fieldBorderColor = fieldBorderColor,
            selectFieldBackgroundColor = selectFieldBackgroundColor,
            activeSelectionBackgroundColor = activeSelectionBackgroundColor,
            focusBorderColor = focusBorderColor,
            badgeBackgroundColor = badgeBackgroundColor,
            bannerWarningBackgroundColor = bannerWarningBackgroundColor,
            bannerTextColor = bannerTextColor,
            separatorColor = statusBarBorderColor,
            fieldNavHoverColor = fieldNavHoverColor,
            scrollbarThumbColor = scrollbarThumbColor,
            fontFamily = fontFamily,
            fontSize = fontSize
        )
        //        val secondaryTextColor = getHexColor(UIUtil.getLabelForeground())
    }
}

@Service(Service.Level.PROJECT)
private class V2NxGenerateUiFileCoroutineHolder(val cs: CoroutineScope) {
    companion object {
        fun getInstance(project: Project): V2NxGenerateUiFileCoroutineHolder =
            project.getService(V2NxGenerateUiFileCoroutineHolder::class.java)
    }
}
