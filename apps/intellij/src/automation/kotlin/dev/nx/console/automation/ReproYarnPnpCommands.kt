package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.LockSemantics
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.ActionManager
import com.intellij.driver.sdk.AnAction
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.net.HttpURLConnection
import java.net.URI
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.deleteIfExists
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("StandardNxGraphServer", plugin = "dev.nx.console")
interface PnpCommandsGraphServer {
    fun start()

    fun getCurrentPort(): Int?
}

@Remote("com.intellij.openapi.wm.impl.IdeFrameImpl")
interface PnpCommandsIdeFrame {
    fun setExtendedState(state: Int)

    fun toFront()

    fun getBalloonLayout(): PnpCommandsBalloonLayout
}

@Remote("com.intellij.ui.BalloonLayoutImpl")
interface PnpCommandsBalloonLayout {
    fun closeAll()
}

@Remote("javax.swing.JTree")
interface PnpCommandsTree {
    fun setSelectionRow(row: Int)

    fun scrollRowToVisible(row: Int)
}

@Remote("com.intellij.openapi.actionSystem.AnAction")
interface PnpCommandsAction {
    fun getTemplateText(): String?
}

@Remote("com.intellij.openapi.actionSystem.ex.ActionUtil")
interface PnpCommandsActionUtil {
    fun getActions(component: Component): List<PnpCommandsAction>
}

private const val MARKER = "apps/demo/pnp-run-marker.txt"

private fun waitFor(timeout: Duration, condition: () -> Boolean): Boolean {
    val deadline = System.nanoTime() + timeout.inWholeNanoseconds
    while (System.nanoTime() < deadline) {
        if (runCatching(condition).getOrDefault(false)) return true
        Thread.sleep(500)
    }
    return false
}

private fun httpStatus(port: Int): Int? =
    runCatching {
            (URI("http://127.0.0.1:$port/").toURL().openConnection() as HttpURLConnection).run {
                connectTimeout = 2000
                readTimeout = 5000
                responseCode.also { disconnect() }
            }
        }
        .getOrNull()

/**
 * In a Yarn PnP workspace, runs `demo:hello` from the Nx Console tree (a run configuration) and
 * starts the project graph server (the command line that generators also use). Both must start the
 * workspace's Nx: the target writes a marker file and the graph server must answer HTTP requests.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(project.getBasePath())
    check(workspace.resolve(".pnp.cjs").exists()) { "$workspace is not a Yarn PnP workspace" }
    val marker = workspace.resolve(MARKER)
    marker.deleteIfExists()

    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, PnpCommandsIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    runCatching { invokeAction("CloseAllEditors", component = frame) }
    runCatching { closeToolWindow("Run") }
    closeToolWindow("Project")
    openToolWindow("Nx Console")

    val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
    check(
        waitFor(3.minutes) {
            tree.expandAll()
            tree.findExpandedPath("Projects", "demo", "hello", fullMatch = true) != null
        }
    ) {
        "Nx Console never listed demo:hello: ${tree.collectExpandedPaths()}"
    }

    val report = StringBuilder()
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "yarn-pnp-commands"
    var targetRan = false
    var graphPort: Int? = null
    var graphStatus: Int? = null

    recordIde(label) {
        Thread.sleep(1500)
        val run =
            withContext(OnDispatcher.EDT) {
                val row =
                    checkNotNull(
                            tree.findExpandedPath("Projects", "demo", "hello", fullMatch = true)
                        )
                        .row
                cast(tree.component, PnpCommandsTree::class).apply {
                    setSelectionRow(row)
                    scrollRowToVisible(row)
                }
                utility<PnpCommandsActionUtil>().getActions(tree.component).single {
                    it.getTemplateText() == "Run"
                }
            }
        withContext(OnDispatcher.EDT, LockSemantics.READ_ACTION) {
            service<ActionManager>()
                .tryToExecute(
                    cast(run, AnAction::class),
                    null,
                    tree.component,
                    "NxToolWindow",
                    true,
                )
        }
        targetRan = waitFor(90.seconds) { marker.exists() }
        report.appendLine("demo:hello wrote $MARKER: $targetRan")
        if (targetRan) report.appendLine("  ${marker.readText().trim()}")
        Thread.sleep(3000)

        val graph = service<PnpCommandsGraphServer>(project)
        graph.start()
        waitFor(90.seconds) {
            graphPort = graph.getCurrentPort()
            graphStatus = graphPort?.let(::httpStatus)
            graphStatus == 200
        }
        report.appendLine("graph server port: $graphPort, HTTP status: $graphStatus")
        Thread.sleep(3000)
    }

    println(report)
    automationOutput()
        .resolve("$label-${System.currentTimeMillis()}")
        .createDirectories()
        .resolve("report.txt")
        .writeText(report.toString())

    val failures = buildList {
        if (!targetRan) add("Running demo:hello from Nx Console did not run the target")
        if (graphStatus != 200) add("The Nx graph server did not serve on port $graphPort")
    }
    check(failures.isEmpty()) { failures.joinToString("\n") }
    println("PASS: target ran and graph server served under Yarn PnP")
}
