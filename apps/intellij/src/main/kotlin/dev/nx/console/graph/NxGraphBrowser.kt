package dev.nx.console.graph

import com.intellij.openapi.application.EDT
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.*
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.project_details.ProjectDetailsBrowser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

class NxGraphBrowser(project: Project) : NxGraphBrowserBase(project) {

    private var currentLoadHtmlJob: Job? = null
    private var currentInteractionEventHandler: JBCefJSQuery? = null

    private var lastGraphCommand: GraphCommand? = null
    private var messageBusConnection = project.messageBus.connect()

    init {
        try {
            loadHtml()
        } catch (e: Throwable) {
            logger<NxGraphBrowser>().debug(e.message)
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
        loadHtml()
    }

    private fun loadHtml() {
        if (currentLoadHtmlJob?.isActive == true) {
            currentLoadHtmlJob?.cancel()
        }
        currentLoadHtmlJob =
            coroutineScope.launch {
                errors =
                    this@NxGraphBrowser.errors
                        ?: NxlsService.getInstance(project).workspace()?.errors
                errors.also {
                    if (it != null) {
                        withContext(Dispatchers.EDT) {
                            wrappedBrowserLoadHtml(getErrorHtml(it))
                            registerResetHandler()
                        }
                        return@launch
                    }
                    withContext(Dispatchers.EDT) {
                        wrappedBrowserLoadHtml(
                            loadGraphHtmlBase(),
                        )
                        registerInteractionEventHandler(browser)
                        if (lastGraphCommand != null) {
                            replayLastCommand()
                        }
                    }
                }
            }
    }

    fun selectAllProjects() {
        lastGraphCommand = GraphCommand.SelectAllProjects()
        executeWhenLoaded {
            if (errors != null) return@executeWhenLoaded
            if (browser.isDisposed) {
                thisLogger().warn("Can't select all projects because browser has been disposed.")
                return@executeWhenLoaded
            }
            browser.executeJavaScript(
                "window.waitForRouter?.().then(() => {console.log('navigating to all'); window.externalApi.selectAllProjects();})"
            )
        }
    }

    fun focusProject(projectName: String) {
        lastGraphCommand = GraphCommand.FocusProject(projectName)
        executeWhenLoaded {
            if (errors != null) return@executeWhenLoaded
            if (browser.isDisposed) return@executeWhenLoaded
            browser.executeJavaScript(
                "window.waitForRouter?.().then(() => {console.log('navigating to $projectName'); window.externalApi.focusProject('$projectName')})"
            )
        }
    }

    fun focusTargetGroup(targetGroup: String) {
        lastGraphCommand = GraphCommand.FocusTargetGroup(targetGroup)
        executeWhenLoaded {
            if (errors != null) return@executeWhenLoaded
            if (browser.isDisposed) return@executeWhenLoaded
            browser.executeJavaScript(
                "window.waitForRouter?.().then(() => {console.log('navigating to group $targetGroup'); window.externalApi.selectAllTargetsByName('$targetGroup')})"
            )
        }
    }

    fun focusTarget(projectName: String, targetName: String) {
        lastGraphCommand = GraphCommand.FocusTarget(projectName, targetName)
        executeWhenLoaded {
            if (errors != null) return@executeWhenLoaded
            if (browser.isDisposed) return@executeWhenLoaded
            browser.executeJavaScript(
                "window.waitForRouter?.().then(() => {console.log('navigating to target $projectName:$targetName'); window.externalApi.focusTarget('$projectName','$targetName')})"
            )
        }
    }

    private fun replayLastCommand() {
        when (lastGraphCommand) {
            is GraphCommand.SelectAllProjects -> selectAllProjects()
            is GraphCommand.FocusProject ->
                focusProject((lastGraphCommand as GraphCommand.FocusProject).projectName)
            is GraphCommand.FocusTargetGroup ->
                focusTargetGroup((lastGraphCommand as GraphCommand.FocusTargetGroup).targetGroup)
            is GraphCommand.FocusTarget -> {
                val command = lastGraphCommand as GraphCommand.FocusTarget
                focusTarget(command.projectName, command.targetName)
            }
        }
    }

    private fun registerInteractionEventHandler(browser: JBCefBrowser) {
        executeWhenLoaded {
            if (browser.isDisposed) return@executeWhenLoaded
            currentInteractionEventHandler?.also { Disposer.dispose(it) }
            val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
            query.addHandler { msg ->
                try {
                    val messageParsed = Json.decodeFromString<NxGraphInteractionEvent>(msg)
                    val handled = handleGraphInteractionEventBase(messageParsed)
                    if (!handled) {
                        logger<NxGraphBrowser>()
                            .error("Unhandled graph interaction event: $messageParsed")
                    }
                } catch (e: SerializationException) {
                    logger<NxGraphBrowser>()
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
            currentInteractionEventHandler = query
        }
    }

    override fun dispose() {
        super.dispose()
        Disposer.dispose(messageBusConnection)
        currentLoadHtmlJob?.cancel()
    }

    private abstract class GraphCommand {
        abstract val type: String

        class SelectAllProjects : GraphCommand() {
            override val type: String = "selectAllProjects"
        }

        data class FocusProject(val projectName: String) : GraphCommand() {
            override val type: String = "focusProject"
        }

        data class FocusTargetGroup(val targetGroup: String) : GraphCommand() {
            override val type: String = "focusTargetGroup"
        }

        data class FocusTarget(val projectName: String, val targetName: String) : GraphCommand() {
            override val type: String = "focusTarget"
        }
    }
}
