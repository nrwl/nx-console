package dev.nx.console.graph

import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import com.intellij.ui.jcef.executeJavaScriptAsync
import com.intellij.util.ui.UIUtil
import dev.nx.console.models.NxVersion
import dev.nx.console.models.ProjectGraphOutput
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.*
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.jcef.getHexColor
import dev.nx.console.utils.jcef.onBrowserLoadEnd
import io.github.z4kn4fein.semver.toVersion
import java.io.File
import java.nio.file.Paths
import java.util.regex.Matcher
import kotlin.io.path.Path
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.jetbrains.concurrency.await

private val logger = logger<OldNxGraphService>()

class OldNxGraphBrowser(
    project: Project,
    private val state: StateFlow<NxGraphStates>,
    private val nxVersion: Deferred<NxVersion?>
) : NxGraphBrowserBase(project) {
    private val cs = OldNxGraphBrowserCoroutineHolder.getInstance(project).cs

    private var lastCommand: Command? = null

    private val foregroundColor = getHexColor(UIUtil.getLabelForeground())

    init {

        cs.launch { listenToGraphStates() }
        registerFileClickHandler(browser)
        registerOpenProjectConfigHandler(browser)
        registerRunTaskHandler(browser)
    }

    fun selectAllProjects() {
        executeWhenLoaded {
            lastCommand = Command.SelectAll
            val major = nxVersion.await()?.major
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
            val major = nxVersion.await()?.major
            if (major == null || major.toInt() > 14) {
                browser.executeJavaScriptAsync("window.externalApi.focusProject('$projectName')")
            } else if (major.toInt() == 14) {
                browser.executeJavaScriptAsync(
                    "window.externalApi.depGraphService.send({type: 'focusProject', projectName: '$projectName'})"
                )
            } else {
                loadOldVersionHtml()
            }
        }
    }

    fun focusTaskGroup(taskGroupName: String) {
        executeWhenLoaded {
            lastCommand = Command.FocusTaskGroup(taskGroupName)
            browser.executeJavaScriptAsync(
                "window.externalApi?.router?.navigate('/tasks/$taskGroupName/all')"
            )
        }
    }

    fun focusTask(nxProject: String, nxTarget: String) {
        executeWhenLoaded {
            lastCommand = Command.FocusTask(nxProject, nxTarget)
            cs.launch {
                browser
                    .executeJavaScriptAsync(
                        "window.externalApi?.router?.navigate('/tasks/$nxTarget')"
                    )
                    .await()
                browser.executeJavaScriptAsync(
                    "document.querySelector('label[data-project=\"$nxProject\"]')?.click()"
                )
            }
        }
    }

    private suspend fun listenToGraphStates() {
        state
            .onEach { event ->
                when (event) {
                    is NxGraphStates.Loading -> loadLoadingHtml()
                    is NxGraphStates.Loaded -> loadGraphHtml(event.graphOutput, event.reload)
                    is NxGraphStates.Error -> loadErrorHtml(event.message)
                    else -> logger.info("got state $event")
                }
            }
            .collect()
    }

    private suspend fun loadGraphHtml(graphOutput: ProjectGraphOutput, reload: Boolean) {

        val fullPath =
            project.nodeInterpreter.let {
                if (isWslInterpreter(it)) {
                    it.distribution.getWindowsPath(graphOutput.fullPath)
                } else graphOutput.fullPath
            }

        val basePath = "${Path(fullPath).parent}/"

        val nxConsoleEnvironmentScriptTag: String =
            NxlsService.getInstance(project).nxVersion()?.let {
                if (it.full.toVersion(strict = false) >= "16.6.0".toVersion(strict = false)) {
                    "<script> window.environment = 'nx-console' </script>"
                } else {
                    ""
                }
            }
                ?: ""

        val originalGraphHtml = File(fullPath).readText(Charsets.UTF_8)
        val transformedGraphHtml =
            originalGraphHtml
                .replace(
                    Regex("<head>"),
                    """
          <head>
          <base href="${Matcher.quoteReplacement(basePath)}">
          <style>
            #sidebar {
              display: none;
            }

            div[data-cy="no-projects-selected"] {
              display: none;
            }

            #app > * {
              display: none;
            }

            #app #main-content {
              display: block !important;
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
          """
                )
                .replace(
                    "</head>",
                    """
                     $nxConsoleEnvironmentScriptTag
                     </head>
                    """
                )
                .replace(Regex("</body>"), """

          </body>
            """)

        browser.loadHTML(transformedGraphHtml, "https://nx-graph")

        if (reload) {
            lastCommand?.apply {
                when (this) {
                    is Command.SelectAll -> selectAllProjects()
                    is Command.FocusProject -> focusProject(projectName)
                    is Command.SelectAllTasks -> selectAllProjects()
                    is Command.FocusTaskGroup -> focusTaskGroup(taskGroupName)
                    is Command.FocusTask -> focusTask(nxProject, nxTarget)
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
            <p>Unable to load the project graph. The following error occurred:</p>
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

    private fun loadLoadingHtml() {
        val html =
            """
            <style>
              .lds-roller {
                display: inline-block;
                position: relative;
                width: 80px;
                height: 80px;
              }

              .lds-roller div {
                animation: lds-roller 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                transform-origin: 40px 40px;
              }

              .lds-roller div:after {
                content: ' ';
                display: block;
                position: absolute;
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: $foregroundColor;
                margin: -4px 0 0 -4px;
              }

              .lds-roller div:nth-child(1) {
                animation-delay: -0.036s;
              }

              .lds-roller div:nth-child(1):after {
                top: 63px;
                left: 63px;
              }

              .lds-roller div:nth-child(2) {
                animation-delay: -0.072s;
              }

              .lds-roller div:nth-child(2):after {
                top: 68px;
                left: 56px;
              }

              .lds-roller div:nth-child(3) {
                animation-delay: -0.108s;
              }

              .lds-roller div:nth-child(3):after {
                top: 71px;
                left: 48px;
              }

              .lds-roller div:nth-child(4) {
                animation-delay: -0.144s;
              }

              .lds-roller div:nth-child(4):after {
                top: 72px;
                left: 40px;
              }

              .lds-roller div:nth-child(5) {
                animation-delay: -0.18s;
              }

              .lds-roller div:nth-child(5):after {
                top: 71px;
                left: 32px;
              }

              .lds-roller div:nth-child(6) {
                animation-delay: -0.216s;
              }

              .lds-roller div:nth-child(6):after {
                top: 68px;
                left: 24px;
              }

              .lds-roller div:nth-child(7) {
                animation-delay: -0.252s;
              }

              .lds-roller div:nth-child(7):after {
                top: 63px;
                left: 17px;
              }

              .lds-roller div:nth-child(8) {
                animation-delay: -0.288s;
              }

              .lds-roller div:nth-child(8):after {
                top: 56px;
                left: 12px;
              }

              @keyframes lds-roller {
                0% {
                  transform: rotate(0deg);
                }
                100% {
                  transform: rotate(360deg);
                }
              }

              main {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
              }
            </style>
            <main>
              <div class="lds-roller">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </main>
        """
                .trimIndent()
        browser.loadHTML(html)
    }

    private fun registerFileClickHandler(browser: JBCefBrowser) {
        onBrowserLoadEnd(browser) {
            val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
            query.addHandler { msg ->
                TelemetryService.getInstance(project)
                    .featureUsed(TelemetryEvent.GRAPH_INTERACTION_OPEN_PROJECT_EDGE_FILE)

                val path = Paths.get(project.nxBasePath, msg).toString()
                val file = LocalFileSystem.getInstance().findFileByPath(path)
                if (file == null) {
                    Notifier.notifyAnything(
                        project,
                        "Couldn't find file at path $path",
                        NotificationType.ERROR
                    )
                    return@addHandler null
                }
                ApplicationManager.getApplication().invokeLater {
                    FileEditorManager.getInstance(project).openFile(file, true)
                }
                null
            }
            val js =
                """
            window.externalApi?.registerFileClickCallback?.((message) => {
                    ${query.inject("message")}
            })
            """
            browser.executeJavaScriptAsync(js)
        }
    }

    private fun registerOpenProjectConfigHandler(browser: JBCefBrowser) {
        onBrowserLoadEnd(browser) {
            val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
            query.addHandler { msg ->
                cs.launch {
                    TelemetryService.getInstance(project)
                        .featureUsed(
                            TelemetryEvent.MISC_SHOW_PROJECT_CONFIGURATION,
                            mapOf("source" to TelemetryEventSource.GRAPH_INTERACTION)
                        )

                    project.nxWorkspace()?.workspace?.projects?.get(msg)?.apply {
                        val path = nxProjectConfigurationPath(project, root) ?: return@apply
                        val file =
                            LocalFileSystem.getInstance().findFileByPath(path) ?: return@apply
                        ApplicationManager.getApplication().invokeLater {
                            FileEditorManager.getInstance(project).openFile(file, true)
                        }
                    }
                }

                null
            }
            val js =
                """
            window.externalApi?.registerOpenProjectConfigCallback?.((message) => {
                    ${query.inject("message")}
            })
            """
            browser.executeJavaScriptAsync(js)
        }
    }

    private fun registerRunTaskHandler(browser: JBCefBrowser) {
        onBrowserLoadEnd(browser) {
            val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
            query.addHandler { msg ->
                cs.launch {
                    TelemetryService.getInstance(project)
                        .featureUsed(
                            TelemetryEvent.TASKS_RUN,
                            mapOf("source" to TelemetryEventSource.GRAPH_INTERACTION)
                        )

                    val (projectName, targetName) = msg.split(":")
                    NxTaskExecutionManager.getInstance(project).execute(projectName, targetName)
                }

                null
            }
            val js =
                """
            window.externalApi?.registerRunTaskCallback?.((message) => {
                    ${query.inject("message")}
            })
            """
            browser.executeJavaScriptAsync(js)
        }
    }

    override fun refresh() {
        thisLogger()
            .debug(
                "refresh called in old graph browser - this shouldn't happen because state is controlled from the outside here."
            )
    }

    private sealed class Command {
        data object SelectAll : Command()

        data class FocusProject(val projectName: String) : Command() {}

        data object SelectAllTasks : Command()

        data class FocusTaskGroup(val taskGroupName: String) : Command() {}

        data class FocusTask(val nxProject: String, val nxTarget: String) : Command() {}
    }

    @Service(Service.Level.PROJECT)
    private class OldNxGraphBrowserCoroutineHolder(val cs: CoroutineScope) {
        companion object {
            fun getInstance(project: Project): OldNxGraphBrowserCoroutineHolder =
                project.getService(OldNxGraphBrowserCoroutineHolder::class.java)
        }
    }
}
