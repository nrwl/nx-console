package dev.nx.console.project_details.browsers

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.JBCefBrowser
import dev.nx.console.models.NxError
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.getNxPackagePath
import dev.nx.console.utils.nxBasePath
import java.nio.file.Paths
import java.util.regex.Matcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.serialization.json.*
import ru.nsk.kstatemachine.event.DataEvent
import ru.nsk.kstatemachine.state.*
import ru.nsk.kstatemachine.statemachine.createStateMachineBlocking
import ru.nsk.kstatemachine.statemachine.processEventByLaunch

object States {
    const val Loading = "Loading"
    const val ShowingPDV = "ShowingPDV"
    const val ShowingError = "ShowingError"
}

class LoadSuccessData(val graphBasePath: String, val pdvData: String)

sealed interface Events {

    class LoadSuccess(override val data: LoadSuccessData) : DataEvent<LoadSuccessData>

    class LoadError(override val data: String) : DataEvent<String>
}

class NewProjectDetailsBrowser(private val project: Project, private val file: VirtualFile) :
    Disposable {
    private val browser: JBCefBrowser = JBCefBrowser()
    private val scope: CoroutineScope = ProjectLevelCoroutineHolderService.getInstance(project).cs

    private val stateMachine =
        createStateMachineBlocking(scope) {
            val showingPDVState = dataState(States.ShowingPDV) { onEntry { showPDV(data) } }

            val showingErrorState = dataState(States.ShowingError) { onEntry { showError(data) } }

            showingPDVState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, String> { targetState = showingErrorState }
            }

            showingErrorState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, String> { targetState = showingErrorState }
            }

            initialState(States.Loading) {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, String> { targetState = showingErrorState }

                onEntry {
                    showLoading()
                    tryLoadPDV()
                }
            }
        }

    val component = browser.component

    init {
        with(project.messageBus.connect(this)) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener {
                    if (project.isDisposed) {
                        return@NxWorkspaceRefreshListener
                    }
                    tryLoadPDV()
                },
            )
        }
    }

    private fun showPDV(data: LoadSuccessData) {
        val html =
            """
           `
    <html>
    <head>
    <base href="${Matcher.quoteReplacement(data.graphBasePath)}">
    <script src="environment.js"></script>
  <link rel="stylesheet" href="styles.css">

    </head>
    <body>
        <div style="padding: 0.5rem 0.5rem 0.5rem 0.5rem" id="root"></div>

    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>


    <script src="runtime.js"></script>
    <script src="styles.js"></script>
    <script src="pdv.umd.js"></script>

      <script>
      const data = ${data.pdvData}

      const root = ReactDOM.createRoot(document.getElementById('root'));

      const pdvelement = React.createElement(PDV.default, {
        project: data.project,
        sourceMap: data.sourceMap,
        onViewInProjectGraph: (data) => vscodeApi.postMessage({
          type: 'open-project-graph',
          payload: {
            projectName: data.projectName,
          }
        })
        }
      )
      root.render(React.createElement(PDV.ExpandedTargetsProvider, null, pdvelement));

    </script>

    </body>
    </html>
    `
       """
                .trimIndent()

        ApplicationManager.getApplication().invokeLater { browser.loadHTML(html) }
    }

    private fun showError(data: String) {
        val html =
            """
            <html>
            <body>
            ERROR: $data
            </body>
            </html>
        """
                .trimIndent()

        ApplicationManager.getApplication().invokeLater { browser.loadHTML(html) }
    }

    private fun showLoading() {
        val html =
            """
            <html>
            <body>
            LOADING
            </body>
            </html>
        """
                .trimIndent()

        ApplicationManager.getApplication().invokeLater { browser.loadHTML(html) }
    }

    private fun tryLoadPDV() {
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val nxPackagePath = getNxPackagePath(project, project.nxBasePath)
            val graphBasePath =
                try {
                    Paths.get(nxPackagePath, "src", "core", "graph").toString() + "/"
                } catch (e: Throwable) {
                    null
                }

            val pdvData = loadPDVDataSerialized()

            if (graphBasePath != null && pdvData.second) {
                stateMachine.processEventByLaunch(
                    Events.LoadSuccess(LoadSuccessData(graphBasePath, pdvData.first))
                )
            } else {
                stateMachine.processEventByLaunch(Events.LoadError(pdvData.first))
            }
        }
    }

    private suspend fun loadPDVDataSerialized(): Pair<String, Boolean> {
        val nxlsService = NxlsService.getInstance(project)

        val workspace = nxlsService.workspace()
        val workspaceString = nxlsService.workspaceSerialized()

        if (workspace == null || workspaceString == null) {
            return Pair(
                buildJsonObject {
                        putJsonArray("errors") {
                            add(buildJsonObject { put("message", "Workspace not found") })
                        }
                    }
                    .toString(),
                false,
            )
        }

        val project = nxlsService.projectByPath(file.path)

        val errorsJson = buildJsonArray {
            workspace.errors?.forEach { error ->
                add(Json.encodeToJsonElement(NxError.serializer(), error))
            }
        }

        if (project == null) {
            return Pair(buildJsonObject { put("errors", errorsJson) }.toString(), false)
        }

        val workspaceJson = Json.parseToJsonElement(workspaceString)
        val projectElement =
            workspaceJson.jsonObject["workspace"]
                ?.jsonObject
                ?.get("projects")
                ?.jsonObject
                ?.get(project.name)

        val sourceMapsElement =
            workspaceJson.jsonObject["workspace"]
                ?.jsonObject
                ?.get("sourceMaps")
                ?.jsonObject
                ?.get(project.root) ?: JsonNull

        return Pair(
            buildJsonObject {
                    putJsonObject("project") {
                        put("name", project.name)
                        put(
                            "type",
                            project.projectType.let {
                                when (it) {
                                    "application" -> "app"
                                    "library" -> "lib"
                                    else -> "e2e"
                                }
                            },
                        )
                        put("data", projectElement ?: buildJsonObject {})
                    }

                    put("sourceMap", sourceMapsElement)
                    put("errors", errorsJson)
                }
                .toString(),
            true,
        )
    }

    override fun dispose() {
        Disposer.dispose(browser)
    }
}
