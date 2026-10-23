package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.getToolWindow
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.isPluginLoaded
import com.intellij.driver.sdk.jdk.getSystemProperty
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.singleProject
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.remote.SwingHierarchyService
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("javax.swing.AbstractButton")
interface PluginDependenciesButton {
    fun doClick()
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface PluginDependenciesFileSystem {
    fun getInstance(): PluginDependenciesFileSystem

    fun refreshAndFindFileByPath(path: String): PluginDependenciesVirtualFile?
}

@Remote("com.intellij.openapi.vfs.VirtualFile") interface PluginDependenciesVirtualFile

@Remote("com.intellij.openapi.wm.ToolWindowManager")
interface PluginDependenciesToolWindowManager {
    fun getInstance(project: Project): PluginDependenciesToolWindowManager

    fun getToolWindow(id: String): PluginDependenciesToolWindow?
}

@Remote("com.intellij.openapi.wm.ToolWindow")
interface PluginDependenciesToolWindow {
    fun getContentManager(): PluginDependenciesContentManager
}

@Remote("com.intellij.ui.content.ContentManager")
interface PluginDependenciesContentManager {
    fun getContents(): Array<PluginDependenciesContent>

    fun setSelectedContent(content: PluginDependenciesContent)
}

@Remote("com.intellij.ui.content.Content")
interface PluginDependenciesContent {
    fun getDisplayName(): String?
}

@Remote("dev.nx.console.utils.GitUtils", plugin = "dev.nx.console")
interface PluginDependenciesGitUtils {
    fun hasUncommittedChanges(project: Project): Boolean
}

private const val REFRESH_ACTION = "dev.nx.console.nxls.NxRefreshWorkspaceAction"
private val EXPECTED_PROJECTS = listOf("core", "demo", "ui", "unrelated")
private val PLATFORM_PLUGIN_PACKAGES =
    listOf(
        "com/intellij/analysis/problemsView",
        "com.intellij.analysis.problemsView",
        "com/intellij/openapi/vcs",
        "com.intellij.openapi.vcs",
        "com/intellij/openapi/diff/impl/patch",
        "com.intellij.openapi.diff.impl.patch",
    )

private fun waitUntil(timeout: Duration, message: () -> String, condition: () -> Boolean) {
    val deadline = System.nanoTime() + timeout.inWholeNanoseconds
    while (!condition()) {
        check(System.nanoTime() < deadline, message)
        Thread.sleep(500)
    }
}

private fun logSince(log: Path, offset: Long): List<String> =
    Files.readAllBytes(log)
        .let { it.copyOfRange(offset.toInt().coerceAtMost(it.size), it.size) }
        .decodeToString()
        .lines()

/**
 * IntelliJ 2026.3 moves the Problems View and VCS APIs out of the core platform into the bundled
 * plugins com.intellij.problemsView and com.intellij.platform.vcs. Nx Console must still show Nx
 * project graph errors in the Problems tool window and read the Git working tree state. Expects a
 * git-initialized fixture with the projects core, demo, ui and unrelated and a valid nx.json.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(3.minutes)
    val ide = getProductVersion()
    check(isPluginLoaded("dev.nx.console")) { "Nx Console is not loaded in $ide" }
    val workspace = Path.of(checkNotNull(System.getenv("NX_AUTOMATION_PROJECT")))
    val nxJson = workspace.resolve("nx.json")
    val originalNxJson = nxJson.readText()
    val ideaLog = Path.of(getSystemProperty("idea.log.path"), "idea.log")
    val output =
        automationOutput()
            .resolve("platform-plugin-dependencies-${System.currentTimeMillis()}")
            .createDirectories()
    val report = StringBuilder("IDE: $ide\n")

    // Startup already registered the Problems View provider, so include this session's startup log.
    // idea.log is appended across launches; earlier sessions start before the last IDE STARTED
    // line.
    val sessionLog =
        ideaLog.readText().let { it.substring(it.lastIndexOf("IDE STARTED").coerceAtLeast(0)) }
    val startupErrors =
        sessionLog.lines().filter { line ->
            (line.contains("NoClassDefFoundError") || line.contains("ClassNotFoundException")) &&
                PLATFORM_PLUGIN_PACKAGES.any { line.contains(it) }
        }

    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "platform-plugin-dependencies") {
        openToolWindow("Nx Console")
        // Earlier runs may leave the tool window showing the error state from a broken nx.json.
        invokeAction(REFRESH_ACTION, component = ui.x("//div[@class='IdeFrameImpl']").component)
        val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
        waitUntil(2.minutes, { "The Nx Console tree never listed $EXPECTED_PROJECTS" }) {
            tree.present() &&
                runCatching {
                        tree.expandAll()
                        tree
                            .collectExpandedPaths()
                            .map { it.path }
                            .filter { it.size == 2 && it.first() == "Projects" }
                            .map { it[1] }
                    }
                    .getOrDefault(emptyList())
                    .containsAll(EXPECTED_PROJECTS)
        }
        report.appendLine("Projects listed before breaking nx.json: true")
        val offset = Files.size(ideaLog)

        try {
            nxJson.writeText("{\n  \"targetDefaults\": {\n")
            utility<PluginDependenciesFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(nxJson.toString())
            invokeAction(REFRESH_ACTION, component = ui.x("//div[@class='IdeFrameImpl']").component)

            val viewErrors =
                ui.x(
                    "//div[@class='NxToolWindowPanel']//div[@class='JButton' and @text='View Errors']"
                )
            waitUntil(2.minutes, { "Nx Console never showed the View Errors button" }) {
                viewErrors.present()
            }
            report.appendLine("Nx Console error panel shown: true")
            Thread.sleep(2000)

            val button = cast(viewErrors.component, PluginDependenciesButton::class)
            val clickError =
                runCatching { withContext(OnDispatcher.EDT) { button.doClick() } }
                    .exceptionOrNull()
                    ?.let { generateSequence(it) { e -> e.cause }.last() }
            report.appendLine("View Errors click error: ${clickError?.message?.take(300)}")
            val problemsVisible =
                runCatching {
                        waitUntil(15.seconds, { "" }) {
                            runCatching { getToolWindow("Problems View").isVisible() }
                                .getOrDefault(false)
                        }
                        true
                    }
                    .getOrDefault(false)
            report.appendLine("Problems tool window visible after View Errors: $problemsVisible")
            output
                .resolve("ui-after-view-errors.html")
                .writeText(service<SwingHierarchyService>().getSwingHierarchyAsDOM(null, false))

            // Nx reports project graph errors against nx.json in the Problems tool window's
            // Project Errors tab. Select that tab through its content manager, without native
            // input.
            val contentManager =
                withContext(OnDispatcher.EDT) {
                    utility<PluginDependenciesToolWindowManager>()
                        .getInstance(singleProject())
                        .getToolWindow("Problems View")
                        ?.getContentManager()
                }
            val tabs =
                withContext(OnDispatcher.EDT) {
                    contentManager?.getContents()?.toList().orEmpty().map {
                        it to (it.getDisplayName() ?: "").replace(Regex("<[^>]+>|\\s+"), " ").trim()
                    }
                }
            report.appendLine("Problems tabs: ${tabs.map { it.second }}")
            tabs
                .firstOrNull { it.second.startsWith("Project Errors") }
                ?.first
                ?.let { tab ->
                    withContext(OnDispatcher.EDT) { contentManager?.setSelectedContent(tab) }
                }
            val problemsText = {
                runCatching {
                        ui.x("//div[@class='Tree' and @accessiblename='Problems']")
                            .getAllTexts()
                            .map { it.text }
                    }
                    .getOrDefault(emptyList())
            }
            val nxErrorListed =
                runCatching {
                        waitUntil(30.seconds, { "" }) {
                            problemsText().any { it.contains("nx.json") }
                        }
                        true
                    }
                    .getOrDefault(false)
            report.appendLine("Problems tool window lists nx.json: $nxErrorListed")
            report.appendLine("Problems tool window texts: ${problemsText().distinct().take(30)}")
            Thread.sleep(3000)

            val gitState =
                runCatching {
                        "${utility<PluginDependenciesGitUtils>().hasUncommittedChanges(singleProject())}"
                    }
                    .getOrElse { "FAILED ${it::class.simpleName}: ${it.message?.take(400)}" }
            report.appendLine("GitUtils.hasUncommittedChanges: $gitState")

            val missingClasses =
                (startupErrors + logSince(ideaLog, offset))
                    .filter { line ->
                        (line.contains("NoClassDefFoundError") ||
                            line.contains("ClassNotFoundException")) &&
                            PLATFORM_PLUGIN_PACKAGES.any { line.contains(it) }
                    }
                    .distinct()
            report.appendLine("Missing platform plugin classes in idea.log: ${missingClasses.size}")
            missingClasses.take(10).forEach { report.appendLine("  $it") }

            output.resolve("result.txt").writeText(report.toString())
            println(report)
            check(missingClasses.isEmpty()) {
                "Nx Console cannot load Problems View or VCS classes"
            }
            check(problemsVisible) { "View Errors did not open the Problems tool window" }
            check(nxErrorListed) { "The Problems tool window does not list the nx.json error" }
            check(gitState == "true" || gitState == "false") { "GitUtils failed: $gitState" }
            println(
                "PASS: Nx Console reports Nx errors in Problems View and reads Git state in $ide"
            )
        } finally {
            nxJson.writeText(originalNxJson)
            utility<PluginDependenciesFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(nxJson.toString())
            invokeAction(REFRESH_ACTION, component = ui.x("//div[@class='IdeFrameImpl']").component)
            output.resolve("result.txt").writeText(report.toString())
        }
    }
}
