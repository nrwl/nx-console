package dev.nx.console.graph.ui

import com.intellij.openapi.Disposable
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefClient
import com.intellij.ui.jcef.executeJavaScriptAsync
import com.intellij.util.ui.UIUtil
import dev.nx.console.graph.NxGraphService
import dev.nx.console.graph.NxGraphStates
import dev.nx.console.models.NxVersion
import dev.nx.console.models.ProjectGraphOutput
import dev.nx.console.utils.jcef.getHexColor
import dev.nx.console.utils.jcef.onBrowserLoadEnd
import java.io.File
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

private val logger = logger<NxGraphService>()

class NxGraphBrowser(
    val project: Project,
    private val state: StateFlow<NxGraphStates>,
    private val nxVersion: Deferred<NxVersion?>
) : Disposable {

    private val browser: JBCefBrowser = JBCefBrowser()
    private val browserLoadedState: MutableStateFlow<Boolean> = MutableStateFlow(false)
    private var lastCommand: Command? = null

    private val backgroundColor = getHexColor(UIUtil.getPanelBackground())

    init {
        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 10)
        browser.setPageBackgroundColor(backgroundColor)

        CoroutineScope(Dispatchers.Default).launch { listenToGraphStates() }
        onBrowserLoadEnd(browser) { browserLoadedState.value = true }
    }

    val component = browser.component

    fun selectAllProjects() {
        executeWhenLoaded {
            lastCommand = Command.SelectAll
            val major = runBlocking { nxVersion.await()?.major }
            if (major == null || major.toInt() > 14) {
                browser.executeJavaScriptAsync("window.externalApi?.selectAllProjects()")
            } else if (major.toInt() == 14) {
                browser.executeJavaScriptAsync(
                    "window.externalApi.depGraphService.send({type: 'selectAll'})"
                )
            } else {
                loadOldVersionHtml()
            }
        }
    }

    fun focusProject(projectName: String) {
        executeWhenLoaded {
            lastCommand = Command.FocusProject(projectName)
            val major = runBlocking { nxVersion.await()?.major }
            if (major == null || major.toInt() > 14) {
                browser.executeJavaScriptAsync("window.externalApi?.focusProject('$projectName')")
            } else if (major.toInt() == 14) {
                browser.executeJavaScriptAsync(
                    "window.externalApi.depGraphService.send({type: 'focusProject', projectName: '$projectName'})"
                )
            } else {
                loadOldVersionHtml()
            }
        }
    }

    fun selectAllTasks() {
        executeWhenLoaded {
            lastCommand = Command.SelectAllTasks
            browser.openDevtools()
            browser.loadHTML("<p>select all tasks</p>")
        }
    }

    fun focusTaskGroup(taskGroupName: String) {
        executeWhenLoaded {
            lastCommand = Command.FocusTaskGroup(taskGroupName)
            browser.executeJavaScriptAsync(
                "window.externalApi?.router?.navigate('tasks/$taskGroupName/all')"
            )
        }
    }

    private suspend fun listenToGraphStates() {
        state
            .onEach { event ->
                when (event) {
                    is NxGraphStates.Loaded -> loadGraphHtml(event.graphOutput, event.reload)
                    is NxGraphStates.Error -> loadErrorHtml(event.message)
                    else -> logger.info("got state $event")
                }
            }
            .collect()
    }

    private fun loadGraphHtml(graphOutput: ProjectGraphOutput, reload: Boolean) {
        browserLoadedState.value = false
        val originalGraphHtml = File(graphOutput.fullPath).readText(Charsets.UTF_8)
        val transformedGraphHtml =
            originalGraphHtml.replace(
                Regex("</head>"),
                """
          <style>
            #sidebar {
              display: none;
            }

            div[data-cy="no-projects-selected"] {
              display: none;
            }

            #no-projects-chosen {
              display: none;
            }

            [data-cy="no-tasks-selected"] {
              display: none;
            }

            body {
              background-color: $backgroundColor !important;
            }
            .nx-select-project {
              padding: 12px;
            }
          </style>
          </head>
          """
            )
        browser.loadHTML(transformedGraphHtml, "file://${graphOutput.fullPath}")

        if (reload) {
            lastCommand?.apply {
                when (this) {
                    is Command.SelectAll -> selectAllProjects()
                    is Command.FocusProject -> focusProject(projectName)
                    is Command.SelectAllTasks -> selectAllProjects()
                    is Command.FocusTaskGroup -> focusTaskGroup(taskGroupName)
                }
            }
        }
    }

    private fun loadErrorHtml(errorMessage: String) {
        browserLoadedState.value = false
        val html =
            """
            <style>
              body {
                    background-color: ${getHexColor(UIUtil.getPanelBackground())} !important;
                    color: ${getHexColor(UIUtil.getLabelForeground())};
                    font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

              }
              pre {
                white-space: pre-wrap;
                border-radius: 5px;
                border: 2px solid ${getHexColor(UIUtil.getLabelForeground())};
                padding: 20px;
              }
            </style>
            <p>Unable to load the project graph. The following error occured:</p>
            <pre>${errorMessage}</pre>
    """
                .trimIndent()
        browser.loadHTML(html)
    }

    private fun loadOldVersionHtml() {
        val html =
            """
      <style>
      body {
       color: ${getHexColor(UIUtil.getLabelForeground())};
                    font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

      }
      p {
       padding: 2rem;
       margin: auto;
      }
      </style>
       <p>The Nx graph integration is only available for Nx versions 14 and up.</p>
    """
                .trimIndent()
        browser.loadHTML(html)
    }

    private fun executeWhenLoaded(block: () -> Unit) {
        if (browserLoadedState.value) {
            block()
        } else {
            CoroutineScope(Dispatchers.Default).launch {
                browserLoadedState.filter { it }.take(1).onEach { block() }.collect()
            }
        }
    }

    override fun dispose() {
        browser.dispose()
    }

    private sealed class Command {
        object SelectAll : Command() {}
        data class FocusProject(val projectName: String) : Command() {}

        object SelectAllTasks : Command() {}
        data class FocusTaskGroup(val taskGroupName: String) : Command() {}
    }
}
