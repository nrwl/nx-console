package dev.nx.console.graph

import NxGraphServer
import com.intellij.notification.NotificationType
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.readText
import com.intellij.ui.JBColor
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.graph.ui.NxGraphDownloadHandler
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.jcef.OpenDevToolsContextMenuHandler
import dev.nx.console.utils.jcef.getHexColor
import dev.nx.console.utils.nxBasePath
import dev.nx.console.utils.nxProjectConfigurationPath
import dev.nx.console.utils.nxWorkspace
import java.nio.file.Paths
import java.util.regex.Matcher
import javax.swing.JComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

abstract class NxGraphBrowserBase(protected val project: Project) : Disposable {
    protected val browser: JBCefBrowser = JBCefBrowser()
    protected val graphServer: NxGraphServer = StandardNxGraphServer.getInstance(project)

    protected val backgroundColor = getHexColor(UIUtil.getPanelBackground())
    protected val queryMessenger = JBCefJSQuery.create(browser as JBCefBrowserBase)
    protected val browserLoadedState: MutableStateFlow<Boolean> = MutableStateFlow(false)

    init {
        graphServer.start()

        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 100)

        browser.jbCefClient.addDownloadHandler(NxGraphDownloadHandler(), browser.cefBrowser)
        browser.jbCefClient.addContextMenuHandler(
            OpenDevToolsContextMenuHandler(),
            browser.cefBrowser
        )
        browser.setPageBackgroundColor(backgroundColor)

        queryMessenger.addHandler { msg ->
            when (msg) {
                "ready" -> browserLoadedState.value = true
                else -> {
                    try {
                        val messageParsed = Json.decodeFromString<NxGraphRequest>(msg)
                        CoroutineScope(Dispatchers.Default).launch {
                            val response = graphServer.handleGraphRequest(messageParsed)
                            browser.executeJavaScript(
                                "window.intellij.handleResponse(${Json.encodeToString(response)})"
                            )
                        }
                    } catch (e: SerializationException) {
                        logger<NxGraphBrowser>().error("Error parsing graph request: ${e.message}")
                    }
                }
            }
            null
        }
    }

    val component: JComponent = browser.component

    protected fun loadGraphHtmlBase(): String {
        browserLoadedState.value = false

        val graphBasePath =
            Paths.get(
                    project.nxBasePath,
                    "node_modules",
                    "nx",
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
                "<base\\b[^>]*/>".toRegex(),
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
                  console.log('handling response', type, id, payload)
                  if (type.startsWith('request') && id && pendingRequests.has(id)) {
                    const payloadParsed = JSON.parse(payload);
                    const resolve = pendingRequests.get(id);
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
                 window.intellij.message = (msg) => {
                        ${queryMessenger.inject("msg")}
                 }

                window.intellij.message("ready");
                 </script>
                </head>"""
                )
            )
        return htmlText
    }

    protected fun handleGraphInteractionEventBase(event: NxGraphInteractionEvent): Boolean {
        when (event.type) {
            "file-click" -> {
                event.payload.url?.also {
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
                CoroutineScope(Dispatchers.Default).launch {
                    TelemetryService.getInstance(project)
                        .featureUsed("Nx Graph Open Project Config File")

                    event.payload.projectName?.also {
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
                event.payload.taskId?.also {
                    val (projectName, targetName) = it.split(":")
                    NxTaskExecutionManager.getInstance(project).execute(projectName, targetName)
                }
                return true
            }
            else -> {
                return false
            }
        }
    }

    protected fun executeWhenLoaded(block: suspend () -> Unit) {
        CoroutineScope(Dispatchers.Default).launch {
            if (browserLoadedState.value) {
                block()
            } else {
                browserLoadedState.filter { it }.take(1).onEach { block() }.collect()
            }
        }
    }

    override fun dispose() {
        browser.dispose()
    }
}

@Serializable
data class NxGraphInteractionEvent(val type: String, val payload: NxGraphInteractionPayload)

@Serializable
data class NxGraphInteractionPayload(
    val projectName: String? = null,
    val targetName: String? = null,
    val url: String? = null,
    val taskId: String? = null,
    val targetConfigString: String? = null,
)

@Serializable
data class NxGraphRequest(val type: String, val id: String, val payload: String? = null) {}
