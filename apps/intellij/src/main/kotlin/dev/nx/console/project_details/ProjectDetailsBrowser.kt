package dev.nx.console.project_details

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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

class ProjectDetailsBrowser(project: Project, private val file: VirtualFile) :
    NxGraphBrowserBase(project), DumbAware {

    private var nxProjectName: String? = null
    private var isShowingPDV = false

    private var currentLoadHtmlJob: Job? = null

    init {
        try {
            loadHtml()
            registerInteractionEventHandler(browser)
        } catch (e: Throwable) {
            logger<ProjectDetailsBrowser>().debug(e.message)
        }

        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                object : NxWorkspaceRefreshListener {
                    override fun onNxWorkspaceRefresh() {
                        CoroutineScope(Dispatchers.Default).launch {
                            try {
                                val error = NxlsService.getInstance(project).workspace()?.error
                                if (error != null) {
                                    loadHtml()
                                } else if (isShowingPDV) {
                                    nxProjectName.also {
                                        if (it != null) {
                                            loadProjectDetails(it)
                                        } else {
                                            loadHtml()
                                        }
                                    }
                                } else {
                                    loadHtml()
                                }
                            } catch (e: Throwable) {
                                logger<ProjectDetailsBrowser>().debug(e.message)
                            }
                        }
                    }
                }
            )
        }
    }

    private fun loadProjectDetails(nxProjectName: String) {
        executeWhenLoaded {
            browser.executeJavaScript(
                "window.waitForRouter().then(() => {console.log('waited for router', window.externalApi, '$nxProjectName'); window.externalApi.openProjectDetails('$nxProjectName')})"
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

    private fun loadHtml() {
        if (currentLoadHtmlJob?.isActive == true) {
            currentLoadHtmlJob?.cancel()
        }
        currentLoadHtmlJob =
            CoroutineScope(Dispatchers.Default).launch {
                try {
                    isShowingPDV = false
                    val nxlsService = NxlsService.getInstance(project)
                    nxlsService.awaitStarted()

                    val version = nxlsService.nxVersion()

                    if (
                        version == null ||
                            !version.gte(NxVersion(major = 17, minor = 3, full = "17.3.0-beta.3"))
                    ) {
                        ApplicationManager.getApplication().invokeLater {
                            browser.loadHTML(
                                """<h1 style="
                          font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif;
                          font-size: ${UIUtil.getLabelFont().size}px;
                          color: ${getHexColor(UIUtil.getActiveTextColor())};
                      ">The Project Details View is only available for Nx 17.3.0 and above</h1>
                      """
                            )
                        }
                        return@launch
                    }
                    var error = nxlsService.workspace()?.error
                    val nxProjectName = nxlsService.projectByPath(file.path)?.name
                    this@ProjectDetailsBrowser.nxProjectName = nxProjectName
                    if (nxProjectName == null && error == null) {
                        error = "Unable to find Nx project for file: ${file.path}"
                    }
                    if (error != null) {
                        ApplicationManager.getApplication().invokeLater {
                            browser.loadHTML(loadErrorHtml(error))
                        }
                        isShowingPDV = false
                        return@launch
                    }
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
                    ApplicationManager.getApplication().invokeLater {
                        isShowingPDV = true
                        browser.loadHTML(htmlText)

                        nxProjectName?.also { loadProjectDetails(it) }
                    }
                } catch (e: Throwable) {
                    logger<ProjectDetailsBrowser>().debug(e.message)
                }
            }
    }

    private fun loadErrorHtml(error: String): String {
        return """
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
      <pre>${error}</pre>
    """
            .trimIndent()
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
