package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.common.jcef
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.copyTo
import kotlin.io.path.deleteIfExists
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes

@Remote("com.intellij.execution.configuration.EnvironmentVariablesTextFieldWithBrowseButton")
interface SmokeEnvironmentComponent {
    fun setEnvs(envs: Map<String, String>)
}

@Remote("javax.swing.JButton")
interface SmokeButton {
    fun doClick()
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val frame = nxlsFrame()
    val rerun = ui.x("//div[@class='JButton' and @text='Stop and Rerun']")
    if (rerun.present()) {
        val cancel = ui.x("//div[@class='JButton' and @text='Cancel']").component
        withContext(OnDispatcher.EDT) { cast(cancel, SmokeButton::class).doClick() }
    }
    val workspace = Path.of(project.getBasePath())
    val marker = workspace.resolve(".nx/since262-smoke.txt")
    marker.deleteIfExists()
    nxlsRunning(project)
    closeToolWindow("Project")
    openToolWindow("Nx Console")
    val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
    nxlsWait(message = { "Nx Console did not render demo:hello" }) {
        tree.expandAll()
        tree.findExpandedPath("Projects", "demo", "hello", fullMatch = true) != null
    }
    val field = ui.x("//div[@class='EnvironmentVariablesTextFieldWithBrowseButton']")
    if (!field.present()) {
        withContext(OnDispatcher.EDT) {
            utility<RunArgumentsConfigurations>()
                .getOrCreateRunnerConfigurationSettings(project, "demo", "hello", "", emptyList())
                .also {
                    service<SavedRunManager>(project).addConfiguration(it)
                    service<SavedRunManager>(project).setSelectedConfiguration(it)
                }
        }
        invokeAction("editRunConfigurations", now = false, component = frame)
    }
    nxlsWait(message = { "Run configuration editor has no environment variables field" }) {
        field.present()
    }
    withContext(OnDispatcher.EDT) {
        cast(field.component, SmokeEnvironmentComponent::class)
            .setEnvs(mapOf("NX_CONSOLE_SMOKE" to "since262"))
    }
    Thread.sleep(2000)
    captureIdeWindows("since262-environment-${System.currentTimeMillis()}").forEachIndexed {
        index,
        file ->
        file.copyTo(automationOutput().resolve("environment-$index.png"), overwrite = true)
    }
    val ok = ui.x("//div[@class='JButton' and @text='OK']").component
    withContext(OnDispatcher.EDT) { cast(ok, SmokeButton::class).doClick() }
    nxlsWait(message = { "Run configuration editor did not close" }) { !field.present() }
    withContext(OnDispatcher.EDT) {
        val saved =
            utility<RunArgumentsConfigurations>()
                .getOrCreateRunnerConfigurationSettings(project, "demo", "hello", "", emptyList())
        service<SavedRunManager>(project).setSelectedConfiguration(saved)
    }
    invokeAction("Run", now = false, component = frame)
    nxlsWait(2.minutes, { "demo:hello did not receive the edited environment variable" }) {
        if (rerun.present()) {
            withContext(OnDispatcher.EDT) { cast(rerun.component, SmokeButton::class).doClick() }
        }
        marker.exists() && marker.readText() == "since262"
    }
    Thread.sleep(2000)
    closeToolWindow("Run")
    if (service<NxlsEditors>(project).getOpenFiles().isNotEmpty()) {
        invokeAction("CloseAllEditors", component = frame)
    }
    openFile("demo/project.json")
    withContext(OnDispatcher.EDT) {
        checkNotNull(service<NxlsEditors>(project).getSelectedEditor()).showWithPreview()
    }
    var details = ""
    nxlsWait(3.minutes, { "Project Details did not render demo:hello: $details" }) {
        details =
            runCatching {
                    ui.jcef()
                        .jcefWorker
                        .callJs("document.getElementById('app')?.innerText ?? ''", 1000)
                }
                .getOrDefault("")
        details.contains("demo") && Regex("\\bhello\\b").containsMatchIn(details)
    }
    Thread.sleep(2000)
    captureIdeWindows("since262-details-${System.currentTimeMillis()}").forEachIndexed { index, file
        ->
        file.copyTo(automationOutput().resolve("details-$index.png"), overwrite = true)
    }
    automationOutput()
        .resolve("since262-smoke.txt")
        .writeText(
            "PASS\nProject tree: demo:hello\nEdited environment reached target: ${marker.readText()}\nProject Details: $details\n"
        )
    inspectIde()
    println(
        "PASS: project tree, run configuration environment, target execution and Project Details"
    )
}
