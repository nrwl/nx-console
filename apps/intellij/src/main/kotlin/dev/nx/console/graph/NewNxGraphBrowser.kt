package dev.nx.console.graph

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import dev.nx.console.models.NxGraphDataResult
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.executeJavascriptWithCatch
import java.util.regex.Matcher
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

class NewNxGraphBrowser(project: Project) : NxGraphBrowserBase(project) {

    private var currentJob: Job? = null
    private val interactionEventHandler: JBCefJSQuery = createInteractionEventHandler()

    private var pageRendered: Boolean = false
    private var lastGraphBasePath: String? = null

    init {
        try {
            refresh()
        } catch (e: Throwable) {
            logger<NewNxGraphBrowser>().debug(e.message)
        }

        val connection = project.messageBus.connect(this)
        connection.subscribe(
            NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
            NxWorkspaceRefreshListener {
                coroutineScope.launch {
                    try {
                        refresh()
                    } catch (e: Throwable) {
                        logger<NewNxGraphBrowser>().debug(e.message)
                    }
                }
            },
        )
    }

    override fun refresh() {
        if (currentJob?.isActive == true) currentJob?.cancel()
        currentJob = coroutineScope.launch { loadAndRender() }
    }

    private suspend fun loadAndRender() {
        val result: NxGraphDataResult? = NxlsService.getInstance(project).graphData()

        if (result == null) {
            renderSimpleError("Unable to load graph data")
            return
        }

        when (result.resultType) {
            "SUCCESS" -> {
                val graphDataSerialized = result.graphDataSerialized
                val graphBasePath = result.graphBasePath
                if (graphDataSerialized == null || graphBasePath == null) {
                    renderSimpleError("Graph data missing")
                    return
                }
                if (!pageRendered || graphBasePath != lastGraphBasePath) {
                    renderGraph(graphBasePath, graphDataSerialized)
                    pageRendered = true
                    lastGraphBasePath = graphBasePath
                } else {
                    updateGraph(graphDataSerialized)
                }
            }
            else -> renderError(result)
        }
    }

    private fun createInteractionEventHandler(): JBCefJSQuery {
        val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
        query.addHandler { msg ->
            try {
                val messageParsed = Json.decodeFromString<NxGraphInteractionEvent>(msg)
                val handled = handleGraphInteractionEventBase(messageParsed)
                if (!handled) {
                    logger<NewNxGraphBrowser>().warn("Unhandled graph interaction event: $messageParsed")
                }
            } catch (e: SerializationException) {
                logger<NewNxGraphBrowser>().error("Error parsing graph interaction event: ${e.message}")
            }
            null
        }
        return query
    }

    private suspend fun renderGraph(graphBasePath: String, graphDataSerialized: String) {
        var html = loadGraphHtmlBase(graphBasePath)
        html = html.replace(
            "</body>",
            (
                """
                <script>
                  const data = $graphDataSerialized;
                  window.externalApi = window.externalApi || {};
                  window.externalApi.graphInteractionEventListener = (message) => {
                    ${interactionEventHandler.inject("JSON.stringify(message)")}
                  };
                  let service = window.renderProjectGraph(data);
                  window.addEventListener('message', (event) => {
                    const message = event.data;
                    if (message && message.type === 'update-graph') {
                      service.send({
                        type: 'updateGraph',
                        ...message.data
                      });
                    }
                  });
                </script>
              </body>
                """
                ).trimIndent(),
        )
        wrappedBrowserLoadHtml(html)
    }

    private fun updateGraph(graphDataSerialized: String) {
        executeWhenLoaded {
            if (browser.isDisposed) return@executeWhenLoaded
            val js =
                """
                const __nx_data = $graphDataSerialized;
                window.postMessage({
                  type: 'update-graph',
                  data: {
                    projects: Object.values(__nx_data.nodes || {}),
                    dependencies: __nx_data.dependencies || {},
                    fileMap: undefined,
                  }
                }, '*');
                """
                    .trimIndent()
            browser.executeJavascriptWithCatch(js)
        }
    }

    private suspend fun renderError(result: NxGraphDataResult) {
        val graphBasePath = result.graphBasePath
        if (graphBasePath.isNullOrEmpty()) {
            renderSimpleError(result.errorMessage ?: "Unable to load graph data")
            return
        }
        var html = loadGraphHtmlBase(graphBasePath)
        val errorMessageEscaped = (result.errorMessage ?: "").replace("\"", "\\\"")
        html = html.replace(
            "</body>",
            (
                """
                <script>
                  const service = window.renderError({
                    message: "$errorMessageEscaped",
                    errors: ${result.errorsSerialized ?: "[]"}
                  });
                </script>
              </body>
                """
                ).trimIndent(),
        )
        wrappedBrowserLoadHtml(html)
    }

    private fun renderSimpleError(message: String) {
        val html =
            """
            <html><body>
              <h2>Nx Console could not load the Project Graph.</h2>
              <h4>Make sure dependencies are installed and refresh the workspace from the editor toolbar.</h4>
              <pre style=\"white-space:pre-wrap;\">${message}</pre>
            </body></html>
            """
                .trimIndent()
        wrappedBrowserLoadHtml(html)
    }

    private fun loadGraphHtmlBase(graphBasePath: String): String {
        val base =
            if (graphBasePath.endsWith("/")) graphBasePath else graphBasePath + "/"
        return (
            """
            <html>
              <head>
                <base href="${Matcher.quoteReplacement(base)}">
                <script src="environment.js"></script>
                <link rel="stylesheet" href="styles.css">
                <style>
                  html, body, #app { height: 100%; }
                  #app { width: 100%; }
                </style>
              </head>
              <body>
                <script>
                  window.__NX_RENDER_GRAPH__ = false;
                  window.environment = 'nx-console';
                </script>
                <div id="app"></div>
                <script src="runtime.js"></script>
                <script src="styles.js"></script>
                <script src="main.js"></script>
              </body>
            </html>
            """
                ).trimIndent()
    }
}
