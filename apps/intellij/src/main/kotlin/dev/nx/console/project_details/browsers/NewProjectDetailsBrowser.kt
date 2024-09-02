package dev.nx.console.project_details.browsers

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.EDT
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.JBCefBrowser
import dev.nx.console.models.NxError
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.getNxPackagePath
import dev.nx.console.utils.nxBasePath
import java.nio.file.Paths
import java.util.regex.Matcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

class NewProjectDetailsBrowser(private val project: Project, private val file: VirtualFile) :
    Disposable {
    private val browser: JBCefBrowser = JBCefBrowser()

    init {
        loadAndShowPDV()
    }

    val component = browser.component

    private fun loadAndShowPDV() {
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val nxPackagePath = getNxPackagePath(project, project.nxBasePath)
            val graphBasePath = Paths.get(nxPackagePath, "src", "core", "graph").toString() + "/"

            val pdvData = loadPDVDataSerialized()
            val html =
                """
           `
    <html>
    <head>
    <base href="${Matcher.quoteReplacement(graphBasePath)}">
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
      const data = ${pdvData}

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

            withContext(Dispatchers.EDT) { browser.loadHTML(html) }
        }
    }

    private suspend fun loadPDVDataSerialized(): String {
        val nxlsService = NxlsService.getInstance(project)

        val workspace = nxlsService.workspace()
        val workspaceString = nxlsService.workspaceSerialized()

        if (workspace == null || workspaceString == null) {
            return buildJsonObject {
                    putJsonArray("errors") {
                        add(buildJsonObject { put("message", "Workspace not found") })
                    }
                }
                .toString()
        }

        val project = nxlsService.projectByPath(file.path)

        val errorsJson = buildJsonArray {
            workspace.errors?.forEach { error ->
                add(Json.encodeToJsonElement(NxError.serializer(), error))
            }
        }

        if (project == null) {
            return buildJsonObject { put("errors", errorsJson) }.toString()
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

        return buildJsonObject {
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
            .toString()
    }

    override fun dispose() {
        Disposer.dispose(browser)
    }
}
