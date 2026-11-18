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
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.concurrent.thread
import kotlin.io.path.copyTo
import kotlin.io.path.createDirectories
import kotlin.io.path.deleteIfExists
import kotlin.io.path.exists
import kotlin.io.path.getLastModifiedTime
import kotlin.io.path.listDirectoryEntries
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

/** Expects child:build to write argv to .nx/marker.json with --mode=production in production. */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    nxlsRunning(project)
    nxlsWait(2.minutes, { "Run Anything workspace cache not ready" }) {
        service<RunAnythingConfigurationWorkspaceCache>(project).getNxWorkspaceSync() != null
    }
    val existingSearch = ui.x("//div[@class='SearchField']")
    if (existingSearch.present() && existingSearch.component.isShowing())
        existingSearch.keyboard { escape() }
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "run-anything-configuration"
    val output = automationOutput().resolve(label).createDirectories()
    val marker = Path.of(project.getBasePath(), ".nx/marker.json")
    val report = StringBuilder("Run Anything configuration\n")
    fun capture(name: String) {
        captureIdeWindows("$label-$name-${System.nanoTime()}").forEach {
            it.copyTo(output.resolve("$name-${it.fileName}"), overwrite = true)
        }
        val recording =
            automationOutput().listDirectoryEntries("$label-*").maxBy { it.getLastModifiedTime() }
        val before = recording.listDirectoryEntries("frame-*.png").size
        nxlsWait(15.seconds, { "Recorder did not capture $name" }) {
            recording.listDirectoryEntries("frame-*.png").size >= before + 4
        }
    }
    recordIde(label) {
        try {
            marker.deleteIfExists()
            invokeAction("dev.nx.console.run.actions.NxRunAnythingAction", component = nxlsFrame())
            val search = ui.x("//div[@class='SearchField']")
            nxlsWait(30.seconds, { "Run Anything did not open" }) {
                search.present() && search.component.isShowing()
            }
            withContext(OnDispatcher.EDT) {
                cast(search.component, RunAnythingConfigurationText::class)
                    .setText("nx run child:build:production --message=\"hello world\"")
            }
            nxlsWait(15.seconds, { "Run Anything command was not entered" }) {
                cast(search.component, RunAnythingConfigurationText::class).getText() ==
                    "nx run child:build:production --message=\"hello world\""
            }
            capture("command")
            search.keyboard { enter() }
            nxlsWait(90.seconds, { "Initial run did not produce child's marker" }) {
                marker.exists() && marker.readText().startsWith("[\"child\"")
            }
            val initial = marker.readText()
            report.appendLine("Initial argv: $initial")
            check(initial.contains("--mode=production") && initial.contains("hello world")) {
                "Initial Run Anything execution lost production or the quoted message: $initial"
            }
            openToolWindow("Run")
            capture("initial-run")
            thread(name = "edit-run-anything-configuration", isDaemon = true) {
                withAutomationDriver {
                    invokeAction("editRunConfigurations", component = nxlsFrame())
                }
            }
            fun field(kind: String, name: String) =
                ui.x("//div[@class='$kind' and @accessiblename='$name:']")
            val configuration = field("JBTextField", "Configuration")
            nxlsWait(30.seconds, { "Edit Configurations did not open" }) {
                configuration.present() && configuration.component.isShowing()
            }
            val fields =
                withContext(OnDispatcher.EDT) {
                    listOf(
                        cast(
                                field("ExpandableTextField", "Projects").component,
                                RunAnythingConfigurationText::class,
                            )
                            .getText(),
                        cast(
                                field("ExpandableTextField", "Targets").component,
                                RunAnythingConfigurationText::class,
                            )
                            .getText(),
                        cast(configuration.component, RunAnythingConfigurationText::class).getText(),
                    )
                }
            report.appendLine("Saved Projects/Targets/Configuration: $fields")
            capture("saved-fields")
            withContext(OnDispatcher.EDT) {
                cast(configuration.component, RunAnythingConfigurationText::class)
                    .setText("production")
            }
            capture("edited-fields")
            withContext(OnDispatcher.EDT) {
                cast(
                        ui.x("//div[@class='JButton' and @text='OK']").component,
                        GutterMenuItem::class,
                    )
                    .doClick()
            }
            nxlsWait(15.seconds, { "Edit Configurations did not close" }) {
                !configuration.present()
            }
            marker.deleteIfExists()
            invokeAction("Run", component = nxlsFrame())
            nxlsWait(90.seconds, { "Edited rerun did not produce child's marker" }) {
                marker.exists() && marker.readText().startsWith("[\"child\"")
            }
            val rerun = marker.readText()
            report.appendLine("Edited rerun argv: $rerun")
            val result = Path.of(project.getBasePath(), ".nx/run-anything-configuration-result.txt")
            result.writeText(report.toString())
            utility<RunArgumentsFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(result.toString())
            closeToolWindow("Project")
            closeToolWindow("Nx Console")
            openFile(".nx/run-anything-configuration-result.txt", waitForCodeAnalysis = false)
            capture("rerun")
            check(
                fields == listOf("child", "build", "production") &&
                    rerun.contains("--mode=production")
            ) {
                "Expected Projects/Targets/Configuration=[child, build, production] and production rerun; saved=$fields; rerun=$rerun"
            }
            report.appendLine("PASS")
        } catch (error: Throwable) {
            report.appendLine("FAIL\n${error.stackTraceToString()}")
            runCatching { capture("failure") }
            throw error
        } finally {
            output.resolve("observations.txt").writeText(report.toString())
            println(report)
        }
    }
}

@Remote("javax.swing.text.JTextComponent")
interface RunAnythingConfigurationText {
    fun setText(text: String)

    fun getText(): String
}

@Remote("dev.nx.console.utils.NxWorkspaceSyncAccessService", plugin = "dev.nx.console")
interface RunAnythingConfigurationWorkspaceCache {
    fun getNxWorkspaceSync(): RunAnythingConfigurationWorkspace?
}

@Remote("dev.nx.console.models.NxWorkspace", plugin = "dev.nx.console")
interface RunAnythingConfigurationWorkspace
