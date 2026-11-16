package dev.nx.console.automation

import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.concurrent.thread
import kotlin.io.path.copyTo
import kotlin.io.path.createDirectories
import kotlin.io.path.deleteIfExists
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

/** Expects demo:hello and util:hello to write argv to .nx/args-<project>-hello.json. */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val root = Path.of(project.getBasePath())
    val frame = nxlsFrame()
    nxlsRunning(project)
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "run-many-configuration"
    val output = automationOutput().resolve(label).createDirectories()
    val markers = listOf("demo", "util").map { root.resolve(".nx/args-$it-hello.json") }
    markers.forEach { it.deleteIfExists() }
    val report = StringBuilder("Run-many configuration\nWorkspace: $root\n")
    withContext(OnDispatcher.EDT) {
        val settings =
            utility<RunArgumentsConfigurations>()
                .getOrCreateRunnerConfigurationSettings(project, "demo", "hello", "", emptyList())
        service<SavedRunManager>(project).addConfiguration(settings)
        service<SavedRunManager>(project).setSelectedConfiguration(settings)
    }
    fun capture(name: String) {
        captureIdeWindows("$label-$name-${System.nanoTime()}").forEach {
            it.copyTo(output.resolve("$name-${it.fileName}"), overwrite = true)
        }
    }
    recordIde(label) {
        try {
            val targets = ui.x("//div[@class='ExpandableTextField' and @accessiblename='Targets:']")
            thread(name = "edit-run-configurations", isDaemon = true) {
                withAutomationDriver {
                    invokeAction("editRunConfigurations", component = nxlsFrame())
                }
            }
            nxlsWait(30.seconds, { "Edit Configurations did not open" }) { targets.present() }
            withContext(OnDispatcher.EDT) {
                fun set(selector: String, value: String) {
                    cast(ui.x(selector).component, GeneratorSearchField::class).setText(value)
                }
                set(
                    "//div[@class='JTextField' and @accessiblename='Name:']",
                    "$label-${System.currentTimeMillis()}",
                )
                set(
                    "//div[@class='ExpandableTextField' and @accessiblename='Projects:']",
                    "demo,util",
                )
                cast(targets.component, GeneratorSearchField::class).setText("hello")
                set(
                    "//div[@class='JBTextField' and @accessiblename='Configuration:']",
                    "production",
                )
                set(
                    "//div[@class='ExpandableTextField' and @accessiblename='Arguments:']",
                    "--output-style=static --skip-nx-cache",
                )
            }
            capture("configuration")
            Thread.sleep(2000)
            withContext(OnDispatcher.EDT) {
                cast(
                        ui.x("//div[@class='JButton' and @text='OK']").component,
                        GutterMenuItem::class,
                    )
                    .doClick()
            }
            nxlsWait(15.seconds, { "Edit Configurations did not close" }) { !targets.present() }
            invokeAction("Run", component = frame)
            nxlsWait(90.seconds, { "Both hello targets must write argv files" }) {
                markers.all { it.exists() }
            }
            val received = markers.map { "${it.fileName}: ${it.readText()}" }
            received.forEach { report.appendLine(it) }
            val result = root.resolve(".nx/run-many-configuration-result.txt")
            result.writeText(
                "Projects: demo,util\nTargets: hello\nConfiguration: production\n\n${received.joinToString("\n\n")}"
            )
            utility<RunArgumentsFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(result.toString())
            closeToolWindow("Project")
            closeToolWindow("Nx Console")
            openFile(".nx/run-many-configuration-result.txt")
            capture("result")
            Thread.sleep(3000)
            check(received.all { it.contains("--mode=production") }) {
                "Configuration production was not passed to both projects:\n${received.joinToString("\n")}"
            }
            report.appendLine("PASS")
        } catch (error: Throwable) {
            report.appendLine("FAIL\n${error.stackTraceToString()}")
            capture("failure")
            throw error
        } finally {
            output.resolve("observations.txt").writeText(report.toString())
            println(report)
        }
    }
}
