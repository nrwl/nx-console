package dev.nx.console.automation

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

fun main() = withAutomationDriver {
    waitForProjectOpen(3.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(checkNotNull(System.getenv("NX_AUTOMATION_PROJECT")))
    val file = workspace.resolve("apps/hello/project.json")
    val original = file.readText()
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "graph-error-ansi-intellij"
    val frame = nxlsFrame()
    val report = StringBuilder("IDE: ${getProductVersion()}\n")
    try {
        recordIde(label) {
            nxlsRunning(project)
            openToolWindow("Nx Console")
            openFile("apps/hello/project.json")
            withContext(OnDispatcher.EDT) {
                checkNotNull(service<NxlsEditors>(project).getSelectedEditor()).showWithPreview()
            }
            var rendered = ""
            fun readDetails(): String =
                runCatching { ui.jcef().jcefWorker.callJs("document.body.innerText", 1000) }
                    .getOrElse { it.toString() }
            nxlsWait(2.minutes, { "Project Details never rendered hello: $rendered" }) {
                rendered = readDetails()
                rendered.contains("hello") && rendered.contains("apps/hello")
            }
            report.appendLine("Healthy Project Details: $rendered")
            file.writeText("{ \"broken\": [ }\n")
            utility<PluginDependenciesFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(file.toString())
            invokeAction("dev.nx.console.nxls.NxRefreshWorkspaceAction", component = frame)
            nxlsWait(2.minutes, { "Project Details never rendered the parse error: $rendered" }) {
                rendered = readDetails()
                rendered.contains("ValueExpected")
            }
            report.appendLine("Rendered graph error: $rendered")
            automationOutput().resolve("$label.txt").writeText(report.toString())
            check(!rendered.contains('\u001b') && !rendered.contains('\u009b')) {
                "Project Details contains raw terminal escape sequences"
            }
            check(rendered.contains("{ \"broken\": [ }")) { "The code frame is missing" }
            report.appendLine("PASS: readable graph error and code frame, no ANSI sequences")
            automationOutput().resolve("$label.txt").writeText(report.toString())
        }
    } finally {
        file.writeText(original)
        utility<PluginDependenciesFileSystem>()
            .getInstance()
            .refreshAndFindFileByPath(file.toString())
        automationOutput().resolve("$label.txt").writeText(report.toString())
    }
}
