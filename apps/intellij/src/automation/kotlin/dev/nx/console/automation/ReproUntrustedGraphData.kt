package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.common.jcef
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes

@Remote("dev.nx.console.graph.NxGraphService", plugin = "dev.nx.console")
interface UntrustedGraphService {
    fun focusProject(projectName: String)
}

private const val UNUSUAL_NAME = "o'util\"</script>"
private const val MARKUP_COMMAND = "echo '</script><img id=\"injected-markup\" src=\"x\">'"

/**
 * Gives the e2e fixture's util project a name with quotes and markup, and demo a target whose
 * command contains markup. Checks that Project Details renders demo with that target as text, and
 * that the graph focuses the renamed project, without either value becoming markup or script.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(3.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(checkNotNull(System.getenv("NX_AUTOMATION_PROJECT")))
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "untrusted-graph-data"
    val utilJson = workspace.resolve("libs/util/project.json")
    val demoJson = workspace.resolve("demo/project.json")
    val report = StringBuilder()
    recordIde(label) {
        val frame = nxlsFrame()
        nxlsRunning(project)
        utilJson.writeText(
            utilJson.readText().replace("\"name\":\"util\"", "\"name\":${jsonString(UNUSUAL_NAME)}")
        )
        demoJson.writeText(
            demoJson
                .readText()
                .replaceFirst(
                    "\"targets\":{",
                    "\"targets\":{\"markup\":{\"command\":${jsonString(MARKUP_COMMAND)}},",
                )
        )
        listOf(utilJson, demoJson).forEach {
            utility<PluginDependenciesFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(it.toString())
        }
        invokeAction("dev.nx.console.nxls.NxRefreshWorkspaceAction", component = frame)
        openToolWindow("Nx Console")

        openFile("demo/project.json")
        withContext(OnDispatcher.EDT) {
            checkNotNull(service<NxlsEditors>(project).getSelectedEditor()).showWithPreview()
        }
        var details = ""
        nxlsWait(2.minutes, { "Project Details never rendered the markup target: $details" }) {
            details =
                runCatching { ui.jcef().jcefWorker.callJs("document.body.innerText", 1000) }
                    .getOrDefault("")
            details.contains("markup")
        }
        val injectedInDetails = injectedMarkup()
        report.appendLine("Project Details lists the markup target: true")
        report.appendLine("Injected element in Project Details: $injectedInDetails")

        runCatching { invokeAction("CloseAllEditors", component = frame) }
        service<UntrustedGraphService>(project).focusProject(UNUSUAL_NAME)
        var selected = ""
        nxlsWait(
            2.minutes,
            { "The graph did not focus the renamed project; selected: '$selected'" },
        ) {
            selected =
                runCatching {
                        ui.jcef()
                            .jcefWorker
                            .callJs(
                                "[...document.querySelectorAll('button[aria-pressed=true]')].map(e => e.textContent.trim()).sort().join(',')",
                                1000,
                            )
                    }
                    .getOrDefault("")
            selected == UNUSUAL_NAME
        }
        val injectedInGraph = injectedMarkup()
        report.appendLine("Graph focused: $selected")
        report.appendLine("Injected element in the graph: $injectedInGraph")
        println(report)
        check(injectedInDetails == "false" && injectedInGraph == "false") {
            "Workspace data became markup: $report"
        }
        Thread.sleep(2000)
    }
    automationOutput().resolve("$label.txt").writeText("PASS\n$report")
}

private fun Driver.injectedMarkup(): String = runCatching {
    ui.jcef().jcefWorker.callJs("String(document.getElementById('injected-markup') !== null)", 1000)
}
    .getOrDefault("unknown")

private fun jsonString(value: String): String =
    "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
