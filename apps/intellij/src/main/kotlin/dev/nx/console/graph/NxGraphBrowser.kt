package dev.nx.console.graph

import NxGraphServer
import com.intellij.openapi.Disposable
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.readText
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.graph.ui.NxGraphDownloadHandler
import dev.nx.console.utils.jcef.OpenDevToolsContextMenuHandler
import dev.nx.console.utils.jcef.getHexColor
import dev.nx.console.utils.nxBasePath
import java.nio.file.Paths
import java.util.regex.Matcher
import javax.swing.JComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

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
            }
            null
        }
    }

    val component: JComponent = browser.component

    protected fun loadGraphHtmlBase(port: Int): String {
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
                        color: ${getHexColor(
            when (UIUtil.isUnderDarcula()) {
              true -> UIUtil.getActiveTextColor()
              false -> UIUtil.getLabelForeground()
            }
          )} !important;
                      }

                    </style>
                      <script>
                window.location.hash ='/'
                window.externalApi = {}
                window.externalApi.loadProjectGraph = () => {
                  return fetch(`http://localhost:$port/project-graph.json`).then(res => res.json());
                };
                window.externalApi.loadTaskGraph = () => {
                  return fetch(`http://localhost:$port/task-graph.json`).then(res => res.json());
                };
                window.externalApi.loadExpandedTaskInputs = (taskId) => {
                  return fetch(`http://localhost:$port/expanded-task-inputs.json`).then(res => res.json());
                };
                window.externalApi.loadSourceMaps = () => {
                  return fetch(`http://localhost:$port/source-maps.json`).then(res => res.json());
                };
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
                 window.intellij = {
                    message(msg) {
                        ${queryMessenger.inject("msg")}
                    }
                }
                window.intellij.message("ready");
                 </script>
                </head>"""
                )
            )
        return htmlText
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

class NxGraphBrowser(project: Project) : NxGraphBrowserBase(project) {

    init {

        CoroutineScope(Dispatchers.Default).launch {
            graphServer.waitForServerReady()
            graphServer.currentPort?.let { port ->
                try {
                    browser.loadHTML(
                        loadGraphHtmlBase(port),
                    )
                } catch (e: Throwable) {
                    logger<NxGraphBrowser>().debug(e.message)
                }
            }
        }
    }

    fun selectAllProjects() {
        executeWhenLoaded {
            browser.executeJavaScriptAsync(
                "window.waitForRouter().then(() => {console.log('navigating to all'); window.externalApi.selectAllProjects();})"
            )
        }
    }

    fun focusProject(projectName: String) {
        executeWhenLoaded {
            browser.executeJavaScriptAsync(
                "window.waitForRouter().then(() => {console.log('navigating to $projectName'); window.externalApi.focusProject('$projectName')})"
            )
        }
    }

    fun focusTargetGroup(targetGroup: String) {
        executeWhenLoaded {
            browser.executeJavaScriptAsync(
                "window.waitForRouter().then(() => {console.log('navigating to group $targetGroup'); window.externalApi.selectAllTargetsByName('$targetGroup')})"
            )
        }
    }

    fun focusTarget(projectName: String, targetName: String) {
        executeWhenLoaded {
            browser.executeJavaScriptAsync(
                "window.waitForRouter().then(() => {console.log('navigating to target $projectName:$targetName'); window.externalApi.focusTarget('$projectName','$targetName')})"
            )
        }
    }
}
