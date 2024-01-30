package dev.nx.console.project_details

import NxGraphServer
import NxGraphServerRefreshListener
import com.google.gson.JsonParser
import com.google.gson.JsonSyntaxException
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.readText
import com.intellij.openapi.vfs.writeText
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.codeStyle.CodeStyleManager
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.graph.NxGraphBrowserBase
import dev.nx.console.graph.NxGraphInteractionEvent
import dev.nx.console.graph.getNxGraphService
import dev.nx.console.models.NxVersion
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.jcef.getHexColor
import dev.nx.console.utils.nxProjectConfigurationPath
import dev.nx.console.utils.nxWorkspace
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

class ProjectDetailsBrowser(project: Project, file: VirtualFile) :
    NxGraphBrowserBase(project), DumbAware {

    private var nxProjectName: String? = null

    init {
        CoroutineScope(Dispatchers.Default).launch {
            val version = NxlsService.getInstance(project).nxVersion() ?: return@launch

            if (!version.gte(NxVersion(major = 17, minor = 3, full = "17.3.0-beta.3"))) {
                browser.loadHTML(
                    """<h1 style="
                          font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif;
                          font-size: ${UIUtil.getLabelFont().size}px;
                          color: ${getHexColor(UIUtil.getActiveTextColor())};
                      ">The Project Details View is only available for Nx 17.3.0 and above</h1>
                      """
                )
                return@launch
            }
            try {
                var htmlText = loadGraphHtmlBase()
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
                registerInteractionEventHandler(browser)

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
                logger<ProjectDetailsBrowser>().debug(e.message)
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
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                object : NxWorkspaceRefreshListener {
                    override fun onNxWorkspaceRefresh() {
                        nxProjectName?.also { loadProjectDetails(it) }
                    }
                }
            )
        }
    }

    private fun loadProjectDetails(nxProjectName: String) {
        executeWhenLoaded {
            browser.executeJavaScript(
                "window.waitForRouter().then(() => window.externalApi.router?.navigate('/project-details/$nxProjectName'))"
            )
        }
    }

    private fun registerInteractionEventHandler(browser: JBCefBrowser) {
        executeWhenLoaded {
            val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
            query.addHandler { msg ->
                try {
                    val messageParsed = Json.decodeFromString<NxGraphInteractionEvent>(msg)
                    val handled = handleGraphInteractionEventBase(messageParsed)
                    if (handled) return@addHandler null
                    when (messageParsed.type) {
                        "open-project-graph" -> {
                            messageParsed.payload.projectName?.also {
                                CoroutineScope(Dispatchers.Default).launch {
                                    val nxGraphService = getNxGraphService(project) ?: return@launch
                                    ApplicationManager.getApplication().invokeLater {
                                        nxGraphService.focusProject(it)
                                    }
                                }
                            }
                        }
                        "open-task-graph" -> {
                            messageParsed.payload.projectName?.also { projectName ->
                                messageParsed.payload.targetName?.also { targetName ->
                                    CoroutineScope(Dispatchers.Default).launch {
                                        val nxGraphService =
                                            getNxGraphService(project) ?: return@launch
                                        ApplicationManager.getApplication().invokeLater {
                                            nxGraphService.focusTask(projectName, targetName)
                                        }
                                    }
                                }
                            }
                        }
                        "override-target" -> {
                            messageParsed.payload.projectName?.also { projectName ->
                                messageParsed.payload.targetName?.also { targetName ->
                                    messageParsed.payload.targetConfigString?.also {
                                        targetConfigString ->
                                        addTargetToProjectConfig(
                                            projectName,
                                            targetName,
                                            targetConfigString
                                        )
                                    }
                                }
                            }
                        }
                        else -> {
                            logger<ProjectDetailsBrowser>()
                                .error("Unhandled graph interaction event: $messageParsed")
                        }
                    }
                } catch (e: SerializationException) {
                    logger<ProjectDetailsBrowser>()
                        .error("Error parsing graph interaction event: ${e.message}")
                }
                null
            }
            val js =
                """
                window.externalApi.graphInteractionEventListener = (message) => {
                    ${query.inject("JSON.stringify(message)")}
                }
                """
            browser.executeJavaScript(js)
        }
    }

    private fun addTargetToProjectConfig(
        projectName: String,
        targetName: String,
        targetConfigString: String
    ) {
        CoroutineScope(Dispatchers.Default).launch {
            project.nxWorkspace()?.workspace?.projects?.get(projectName)?.apply {
                val path = nxProjectConfigurationPath(project, root) ?: return@apply
                ApplicationManager.getApplication().invokeLater {
                    val file =
                        LocalFileSystem.getInstance().findFileByPath(path) ?: return@invokeLater
                    val document =
                        FileDocumentManager.getInstance().getDocument(file) ?: return@invokeLater
                    val psiFile =
                        PsiDocumentManager.getInstance(project).getPsiFile(document)
                            ?: return@invokeLater
                    val fileText = file.readText()
                    try {
                        val json = JsonParser.parseString(fileText).asJsonObject
                        val targets = json.getAsJsonObject("targets")
                        val newTargetJson = JsonParser.parseString(targetConfigString).asJsonObject
                        targets.add(targetName, newTargetJson)
                        WriteCommandAction.runWriteCommandAction(project) {
                            file.writeText(json.toString())
                            CodeStyleManager.getInstance(project).reformat(psiFile)
                        }
                    } catch (e: JsonSyntaxException) {
                        Notifier.notifyAnything(
                            project,
                            "Error parsing json: ${e.message}",
                            NotificationType.ERROR
                        )
                    }
                }
            }
        }
    }
}
