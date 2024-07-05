package dev.nx.console.graph

import NxGraphServer
import StandardNxGraphServer
import com.intellij.ide.ui.UISettingsListener
import com.intellij.notification.NotificationType
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.readText
import com.intellij.ui.JBColor
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.graph.ui.NxGraphDownloadHandler
import dev.nx.console.models.NxError
import dev.nx.console.nxls.NxRefreshWorkspaceService
import dev.nx.console.run.NxHelpCommandService
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.run.actions.NxConnectService
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.*
import dev.nx.console.utils.jcef.OpenDevToolsContextMenuHandler
import dev.nx.console.utils.jcef.getHexColor
import java.nio.file.Paths
import java.util.regex.Matcher
import javax.swing.JComponent
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

abstract class NxGraphBrowserBase(protected val project: Project) : Disposable {
    protected val browser: JBCefBrowser = JBCefBrowser()

    private val graphServer: NxGraphServer = StandardNxGraphServer.getInstance(project)
    private val queryMessenger = createGraphRequestMessenger()
    private val resetQuery: JBCefJSQuery = createResetQuery()

    protected val coroutineScope =
        NxGraphBrowserBaseCoroutineHolder.getInstance(project).coroutineScope

    protected var backgroundColor = getHexColor(UIUtil.getPanelBackground())
    protected val browserLoadedState: MutableStateFlow<Boolean> = MutableStateFlow(false)
    protected val executeWhenLoadedJobs: MutableList<Job> = mutableListOf()

    protected var errors: Array<NxError>? = null

    init {
        graphServer.start()

        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 100)

        browser.jbCefClient.addDownloadHandler(NxGraphDownloadHandler(), browser.cefBrowser)
        browser.jbCefClient.addContextMenuHandler(
            OpenDevToolsContextMenuHandler(),
            browser.cefBrowser
        )
        browser.setOpenLinksInExternalBrowser(true)

        registerThemeListener()
    }

    val component: JComponent = browser.component

    protected fun wrappedBrowserLoadHtml(html: String, url: String? = null): Unit {
        browserLoadedState.value = false
        executeWhenLoadedJobs.forEach { it.cancel("Loading browser html, cancelling old jobs.") }

        executeWhenLoadedJobs.clear()
        if (browser.isDisposed) return

        var modifiedHtml = html
        val injectedScript =
            """
         <script defer>
         if(!window.intellij) {
               window.intellij = {}
           }
           window.intellij.message = (msg) => {
                        ${queryMessenger.inject("msg")}
            }
            window.intellij.message("ready");
          </script>
      """
                .trimIndent()

        if (html.contains("</head>")) {
            modifiedHtml = modifiedHtml.replace("</head>", "$injectedScript</head>")
        } else {
            modifiedHtml += injectedScript
        }

        if (url != null) {
            browser.loadHTML(modifiedHtml, url)
        } else {
            browser.loadHTML(modifiedHtml)
        }

        setColors()
    }

    protected fun loadGraphHtmlBase(): String {

        val nxPackagePath = getNxPackagePath(project, project.nxBasePath)
        val graphBasePath =
            Paths.get(
                    nxPackagePath,
                    "src",
                    "core",
                    "graph",
                )
                .toString() + "/"

        val graphIndexHtmlPath = Paths.get(graphBasePath, "index.html").toString()

        val file =
            LocalFileSystem.getInstance().refreshAndFindFileByPath(graphIndexHtmlPath) ?: return ""

        var htmlText = file.readText()

        htmlText =
            htmlText.replace(
                "<base\\b[^>]*>".toRegex(),
                """
                  <base href="${Matcher.quoteReplacement(graphBasePath)}">
                  """
            )

        htmlText =
            htmlText.replace(
                "<script(\\s[^>]*?)\\stype=\"module\"([^>]*?)>".toRegex(),
                "<script$1$2>"
            )

        htmlText =
            htmlText.replace(
                "</head>".toRegex(),
                Matcher.quoteReplacement(
                    """
                      <style>
                      #sidebar {
                        display: none;
                      }

                      [data-cy="no-tasks-selected"] {
                        display: none;
                      }

                      body {
                        background-color: $backgroundColor !important;
                        color: ${
                        getHexColor(
                            when (!JBColor.isBright()) {
                                true -> UIUtil.getActiveTextColor()
                                false -> UIUtil.getLabelForeground()
                            }
                        )
                    } !important;
                      }

                    </style>
                      <script>
                window.location.hash ='/'
                window.externalApi = {}
                window.intellij = {}

                const pendingRequests = new Map();

                window.intellij.handleResponse = ({ type, id, payload }) => {
                  if (type.startsWith('request') && id && pendingRequests.has(id)) {
                    const payloadParsed = JSON.parse(payload);
                    const resolve = pendingRequests.get(id);
                    console.log('Received response for', type, payloadParsed);
                    resolve(payloadParsed);
                    pendingRequests.delete(id);
                  }
                }

                function sendRequest(type, payload) {
                  return new Promise((resolve) => {
                    const id = generateUniqueId();
                    pendingRequests.set(id, resolve);
                    window.intellij.message(JSON.stringify({ type, id, payload }));
                  });
                }

                function generateUniqueId() {
                  return Math.random().toString(36).substr(2, 9);
                }

                window.externalApi.loadProjectGraph = () => sendRequest('requestProjectGraph');
                window.externalApi.loadTaskGraph = () => sendRequest('requestTaskGraph');
                window.externalApi.loadExpandedTaskInputs = (taskId) => sendRequest('requestExpandedTaskInputs', taskId);
                window.externalApi.loadSourceMaps = () => sendRequest('requestSourceMaps');

                window.environment = 'nx-console'

                // waiting for nx graph to be ready
                async function waitForRouter() {
                  if (window.externalApi && window.externalApi.router) {
                      return;
                  }
                  const waitForRouterPromise = () => {
                      return new Promise((resolve) => {
                          const observer = new MutationObserver((mutationList, observer) => {
                              if (window.externalApi && window.externalApi.router) {
                                  observer.disconnect();
                                  resolve();
                              }
                          });
                          observer.observe(document.body, { childList: true, subtree: true });
                      });
                  };
                  await waitForRouterPromise();
                }
                 window.waitForRouter = waitForRouter;

                 </script>
                </head>"""
                )
            )

        setColors()
        return htmlText
    }

    protected fun setErrorsAndRefresh(errors: Array<NxError>?) {
        this.errors = errors
        refresh()
    }

    abstract fun refresh()

    protected fun handleGraphInteractionEventBase(event: NxGraphInteractionEvent): Boolean {
        when (event.type) {
            "file-click" -> {
                event.payload?.url?.also {
                    val fullPath = Paths.get(project.nxBasePath, it).toString()
                    val file = LocalFileSystem.getInstance().findFileByPath(fullPath)
                    if (file == null) {
                        Notifier.notifyAnything(
                            project,
                            "Couldn't find file at path $fullPath",
                            NotificationType.ERROR
                        )
                        return true
                    }
                    val fileEditorManager = FileEditorManager.getInstance(project)
                    ApplicationManager.getApplication().invokeLater {
                        fileEditorManager.openFile(file, true)
                    }
                }
                return true
            }
            "open-project-config" -> {
                coroutineScope.launch {
                    TelemetryService.getInstance(project)
                        .featureUsed("Nx Graph Open Project Config File")

                    event.payload?.projectName?.also {
                        project.nxWorkspace()?.workspace?.projects?.get(it)?.apply {
                            val path = nxProjectConfigurationPath(project, root) ?: return@apply
                            val file =
                                LocalFileSystem.getInstance().findFileByPath(path) ?: return@apply
                            ApplicationManager.getApplication().invokeLater {
                                FileEditorManager.getInstance(project).openFile(file, true)
                            }
                        }
                    }
                }
                return true
            }
            "run-task" -> {
                event.payload?.taskId?.also {
                    val (projectName, targetName) = it.split(":")
                    NxTaskExecutionManager.getInstance(project).execute(projectName, targetName)
                }
                return true
            }
            "run-help" -> {
                event.payload?.let { (projectName, _, _, _, _, helpCommand) ->
                    if (projectName != null && helpCommand != null) {
                        NxHelpCommandService.getInstance(project).execute(projectName, helpCommand)
                    }
                }
                return true
            }
            "nx-connect" -> {
                NxConnectService.getInstance(project).connectToCloud()
                return true
            }
            else -> {
                return false
            }
        }
    }

    protected fun executeWhenLoaded(block: suspend () -> Unit) {
        val job =
            coroutineScope.launch {
                if (browserLoadedState.value) {
                    block()
                } else {
                    browserLoadedState.filter { it }.take(1).onEach { block() }.collect()
                }
            }
        executeWhenLoadedJobs.add(job)
    }

    protected fun getErrorHtml(errors: Array<NxError>): String {
        return """
       <style>
              body {
                    background-color: ${getHexColor(UIUtil.getPanelBackground())} !important;
                    color: ${getHexColor(UIUtil.getLabelForeground())};
                    font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

              }
              pre {
                overflow-x: auto;
                border-radius: 5px;
                border: 2px solid ${getHexColor(UIUtil.getLabelForeground())};
                padding: 20px;
              }
              a {
                color: rgb(59 130 246)
              }
            </style>

            <p>Unable to load the project graph. The following error${if (errors.isNotEmpty()) "s" else ""} occurred:</p>
      ${
            errors.map { "<pre>${it.message ?: ""} \n ${it.stack ?: ""}</pre>" }.joinToString("\n")
        }
      If you are unable to resolve this issue, click here to <a href="#" onclick="window.reset()">reload the project graph</a>. If that doesn't work, try running <code>nx reset</code> in the terminal & restart the IDE.
    """
            .trimIndent()
    }

    private fun createResetQuery(): JBCefJSQuery {
        val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
        query.addHandler {
            NxRefreshWorkspaceService.getInstance(project).refreshWorkspace()
            null
        }
        return query
    }

    protected fun registerResetHandler() {
        executeWhenLoaded {
            if (browser.isDisposed) return@executeWhenLoaded
            val js =
                """
                window.reset = () => {
                    ${resetQuery.inject("reset")}
                }
                """
            withContext(Dispatchers.EDT) { browser.executeJavascriptWithCatch(js) }
        }
    }

    private fun registerThemeListener() {
        setColors()
        val connection = ApplicationManager.getApplication().messageBus.connect(this)
        connection.subscribe(UISettingsListener.TOPIC, UISettingsListener { setColors() })
    }

    private fun setColors() {
        backgroundColor = getHexColor(UIUtil.getPanelBackground())
        executeWhenLoaded {
            if (browser.isDisposed) return@executeWhenLoaded
            browser.setPageBackgroundColor(backgroundColor)
            browser.executeJavascriptWithCatch(
                """
                const isDark = ${!JBColor.isBright()};
              const body = document.body;
              if(!body) return;

              const darkClass = 'vscode-dark';
              const lightClass = 'vscode-light';

              body.classList?.remove(darkClass, lightClass);

              if (isDark) {
                  body.classList?.add(darkClass);
              } else {
                  body.classList?.add(lightClass);
              }
              console.log("$backgroundColor")
              body.style?.setProperty('background-color', '$backgroundColor', 'important');
                """
                    .trimIndent()
            )
        }
    }

    private fun createGraphRequestMessenger(): JBCefJSQuery {
        val queryMessenger = JBCefJSQuery.create(browser as JBCefBrowserBase)
        queryMessenger.addHandler { msg ->
            when (msg) {
                "ready" -> {
                    logger<NxGraphBrowserBase>().trace("Browser received ready message")
                    browserLoadedState.value = true
                }
                else -> {
                    try {
                        val messageParsed = Json.decodeFromString<NxGraphRequest>(msg)
                        coroutineScope.launch {
                            val response =
                                withContext(Dispatchers.IO) {
                                    graphServer.handleGraphRequest(messageParsed)
                                }
                            if (queryMessenger.isDisposed) return@launch
                            if (response.error != null) {
                                thisLogger()
                                    .debug("Error handling graph request: ${response.error}")
                                setErrorsAndRefresh(arrayOf(NxError(response.error)))
                                return@launch
                            }
                            try {
                                browser.executeJavaScript(
                                    "window.intellij.handleResponse(${Json.encodeToString(response)})"
                                )
                            } catch (e: JBCefBrowserJsCallError) {
                                logger<NxGraphBrowserBase>()
                                    .warn("Error executing JS: ${e.message}")
                            }
                        }
                    } catch (e: SerializationException) {
                        logger<NxGraphBrowser>().debug("Error parsing graph request: ${e.message}")
                    }
                }
            }
            null
        }

        return queryMessenger
    }

    override fun dispose() {
        Disposer.dispose(browser)
        executeWhenLoadedJobs.forEach { it.cancel("Browser disposed") }
    }
}

@Serializable
data class NxGraphInteractionEvent(
    val type: String,
    val payload: NxGraphInteractionPayload? = null
)

@Serializable
data class NxGraphInteractionPayload(
    val projectName: String? = null,
    val targetName: String? = null,
    val url: String? = null,
    val taskId: String? = null,
    val targetConfigString: String? = null,
    val helpCommand: String? = null,
)

@Serializable
data class NxGraphRequest(
    val type: String,
    val id: String,
    val payload: String? = null,
    val error: String? = null
)

@Service(Service.Level.PROJECT)
class NxGraphBrowserBaseCoroutineHolder(val coroutineScope: CoroutineScope) {
    companion object {
        fun getInstance(project: Project): NxGraphBrowserBaseCoroutineHolder =
            project.getService(NxGraphBrowserBaseCoroutineHolder::class.java)
    }
}
