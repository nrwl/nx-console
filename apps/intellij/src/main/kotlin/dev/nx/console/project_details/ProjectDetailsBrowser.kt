package dev.nx.console.project_details

import NxGraphServer
import NxGraphServerRefreshListener
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.executeJavaScriptAsync
import com.intellij.util.ui.UIUtil
import dev.nx.console.graph.NxGraphBrowser
import dev.nx.console.graph.NxGraphBrowserBase
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.Notifier
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ProjectDetailsBrowser(project: Project, file: VirtualFile) :
    NxGraphBrowserBase(project), DumbAware {

    private var nxProjectName: String? = null

    init {
        CoroutineScope(Dispatchers.Default).launch {
            graphServer.waitForServerReady()
            graphServer.currentPort?.also { port ->
                try {
                    var htmlText = loadGraphHtmlBase(port)
                    htmlText =
                        htmlText.replace(
                            "</head>".toRegex(),
                            """
                    <style>
                    body {
                    font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif;
                    font-size: ${UIUtil.getLabelFont().size}px;
                    }
                    </style>
                    </head>
                  """
                                .trimIndent()
                        )
                    browser.loadHTML(htmlText)

                    val nxlsService = NxlsService.getInstance(project)

                    val completionSignal = CompletableDeferred<Unit>()
                    nxlsService.runAfterStarted { completionSignal.complete(Unit) }
                    completionSignal.await()

                    val nxProjectName = nxlsService.projectByPath(file.path)?.name
                    if (nxProjectName == null) {
                        Notifier.notifyNoProject(project, file.path)
                    } else {
                        this@ProjectDetailsBrowser.nxProjectName = nxProjectName
                        loadProjectDetails(nxProjectName)
                    }
                } catch (e: Throwable) {
                    logger<NxGraphBrowser>().debug(e.message)
                }
            }

            with(project.messageBus.connect()) {
                subscribe(
                    NxGraphServer.NX_GRAPH_SERVER_REFRESH,
                    object : NxGraphServerRefreshListener {
                        override fun onRefresh() {
                            nxProjectName?.also { loadProjectDetails(it) }
                        }
                    }
                )
            }
        }
    }

    private fun loadProjectDetails(nxProjectName: String) {
        executeWhenLoaded {
            browser.executeJavaScriptAsync(
                "window.waitForRouter().then(() => window.externalApi.router?.navigate('/project-details/$nxProjectName'))"
            )
        }
    }
}
