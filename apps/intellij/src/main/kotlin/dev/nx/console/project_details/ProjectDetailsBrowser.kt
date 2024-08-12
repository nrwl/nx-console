package dev.nx.console.project_details

import com.google.gson.JsonParser
import com.google.gson.JsonSyntaxException
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
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
import dev.nx.console.models.NxError
import dev.nx.console.models.NxVersion
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.executeJavascriptWithCatch
import dev.nx.console.utils.jcef.getHexColor
import dev.nx.console.utils.nxProjectConfigurationPath
import dev.nx.console.utils.nxWorkspace
import kotlinx.coroutines.*
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

class ProjectDetailsBrowser(project: Project, private val file: VirtualFile) :
    NxGraphBrowserBase(project), DumbAware {

    private var nxProjectName: String? = null

    private var currentLoadHtmlJob: Job? = null
    private val interactionEventQuery: JBCefJSQuery = createInteractionEventQuery()

    private val messageBusConnection = project.messageBus.connect(this)

    init {
        try {
            loadHtml()
        } catch (e: Throwable) {
            logger<ProjectDetailsBrowser>().debug(e.message)
        }

        with(messageBusConnection) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener {
                    coroutineScope.launch {
                        try {
                            val errors = NxlsService.getInstance(project).workspace()?.errors
                            setErrorsAndRefresh(errors)
                        } catch (e: Throwable) {
                            logger<ProjectDetailsBrowser>().debug(e.message)
                        }
                    }
                }
            )
        }
    }

    override fun refresh() {
        thisLogger().trace("refreshing PDV ${file.path}")
        if (project.isDisposed) return
        loadHtml()
    }

    private fun loadProjectDetails(nxProjectName: String) {
        executeWhenLoaded {
            if (browser.isDisposed) return@executeWhenLoaded
            withContext(Dispatchers.EDT) {
                browser.executeJavaScript(
                    "window.waitForRouter?.().then(() => {console.log('waited for router', window.externalApi, '$nxProjectName'); window.externalApi.openProjectDetails('$nxProjectName')})"
                )
            }
        }
    }

    private fun createInteractionEventQuery(): JBCefJSQuery {
        val query = JBCefJSQuery.create(browser as JBCefBrowserBase)

        query.addHandler { msg ->
            try {
                val messageParsed = Json.decodeFromString<NxGraphInteractionEvent>(msg)
                val handled = handleGraphInteractionEventBase(messageParsed)
                if (handled) return@addHandler null
                when (messageParsed.type) {
                    "open-project-graph" -> {
                        messageParsed.payload?.projectName?.also {
                            coroutineScope.launch {
                                val nxGraphService = getNxGraphService(project) ?: return@launch
                                withContext(Dispatchers.EDT) { nxGraphService.focusProject(it) }
                            }
                        }
                    }
                    "open-task-graph" -> {
                        messageParsed.payload?.projectName?.also { projectName ->
                            messageParsed.payload.targetName?.also { targetName ->
                                coroutineScope.launch {
                                    val nxGraphService = getNxGraphService(project) ?: return@launch
                                    ApplicationManager.getApplication().invokeLater {
                                        nxGraphService.focusTask(projectName, targetName)
                                    }
                                }
                            }
                        }
                    }
                    "override-target" -> {
                        messageParsed.payload?.projectName?.also { projectName ->
                            messageParsed.payload.targetName?.also { targetName ->
                                messageParsed.payload.targetConfigString?.also { targetConfigString
                                    ->
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

        return query
    }

    private fun registerInteractionEventHandler() {
        executeWhenLoaded {
            if (browser.isDisposed) return@executeWhenLoaded

            val js =
                """
                window.externalApi.graphInteractionEventListener = (message) => {
                    ${interactionEventQuery.inject("JSON.stringify(message)")}
                }
                """
            withContext(Dispatchers.EDT) { browser.executeJavascriptWithCatch(js) }
        }
    }

    private fun loadHtml() {
        if (currentLoadHtmlJob?.isActive == true) {
            currentLoadHtmlJob?.cancel()
        }
        currentLoadHtmlJob =
            coroutineScope.launch {
                thisLogger().trace("loading PDV view ${file.path}")
                val nxlsService = NxlsService.getInstance(project)
                try {
                    nxlsService.awaitStarted()

                    val version = nxlsService.nxVersion()

                    if (
                        version == null ||
                            !version.gte(NxVersion(major = 17, minor = 3, full = "17.3.0-beta.3"))
                    ) {
                        withContext(Dispatchers.EDT) {
                            thisLogger().trace("Loading old version html ${file.path}")
                            wrappedBrowserLoadHtml(loadOldVersionHtml())
                        }
                        return@launch
                    }

                    val nxWorkspace = nxlsService.workspace()
                    var errors = this@ProjectDetailsBrowser.errors ?: nxWorkspace?.errors
                    val nxProjectName = nxlsService.projectByPath(file.path)?.name
                    this@ProjectDetailsBrowser.nxProjectName = nxProjectName
                    if (nxProjectName == null && errors == null) {
                        errors =
                            arrayOf(
                                NxError(
                                    message = "Unable to find Nx project for file: ${file.path}",
                                    null,
                                    null,
                                    file = file.path,
                                    null,
                                    null,
                                )
                            )
                    }
                    val hasProjects = nxWorkspace?.workspace?.projects?.isNotEmpty() == true
                    val hasProject =
                        nxProjectName != null &&
                            nxWorkspace?.workspace?.projects?.get(nxProjectName) != null
                    if (
                        errors != null &&
                            (!hasProjects ||
                                nxWorkspace?.isPartial != true ||
                                !hasProject ||
                                version.major < 19)
                    ) {
                        withContext(Dispatchers.EDT) {
                            if (browser.isDisposed) return@withContext
                            thisLogger().trace("Error found, loading error html ${file.path}")
                            wrappedBrowserLoadHtml(getErrorHtml(errors))
                            registerResetHandler()
                        }
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
                    color: ${getHexColor(UIUtil.getActiveTextColor())};
                    }
                    </style>
                    </head>
                  """
                                .trimIndent()
                        )
                    withContext(Dispatchers.EDT) {
                        thisLogger().trace("Loading actual PDV html ${file.path}")

                        wrappedBrowserLoadHtml(htmlText)
                        registerInteractionEventHandler()

                        nxProjectName?.also { loadProjectDetails(it) }
                    }
                } catch (e: Throwable) {
                    logger<ProjectDetailsBrowser>()
                        .debug(
                            "error while loading PDV, loading error html ${file.path}: /n ${e.message}"
                        )
                    withContext(Dispatchers.EDT) {
                        if (browser.isDisposed) return@withContext
                        val error =
                            NxError(
                                message = e.message
                                        ?: "Nx Console encountered an error while loading. Please reset to try again.",
                                null,
                                stack = e.stackTraceToString(),
                                file = file.path,
                                null,
                                null
                            )
                        wrappedBrowserLoadHtml(getErrorHtml(arrayOf(error)))

                        registerResetHandler()
                    }
                }
            }
    }

    private fun loadOldVersionHtml(): String {
        return """<h1 style="
                          font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif;
                          font-size: ${UIUtil.getLabelFont().size}px;
                          color: ${getHexColor(UIUtil.getActiveTextColor())};
                      ">The Project Details View is only available for Nx 17.3.0 and above</h1>
                      """
    }

    private fun addTargetToProjectConfig(
        projectName: String,
        targetName: String,
        targetConfigString: String
    ) {
        coroutineScope.launch {
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

    override fun dispose() {
        super.dispose()
        messageBusConnection.dispose()
        currentLoadHtmlJob?.cancel()
        interactionEventQuery.dispose()
    }
}
