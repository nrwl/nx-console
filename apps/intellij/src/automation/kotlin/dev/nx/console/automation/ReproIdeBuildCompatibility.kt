package dev.nx.console.automation

import com.intellij.driver.sdk.getPlugin
import com.intellij.driver.sdk.isPluginLoaded
import com.intellij.driver.sdk.jdk.getSystemProperty
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.readLines
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes

private const val PLUGIN_ID = "dev.nx.console"
private val EXPECTED_PROJECTS = listOf("core", "demo", "ui", "unrelated")

/**
 * Nx Console must either work in the running IDE build or be rejected by it as incompatible. A
 * plugin that loads into a build missing the platform APIs it calls leaves the Nx Console tool
 * window loading forever. Expects a fixture with the projects core, demo, ui and unrelated.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(3.minutes)
    val ide = getProductVersion()
    val ideaLog = Path.of(getSystemProperty("idea.log.path"), "idea.log")
    val output =
        automationOutput()
            .resolve("ide-build-compatibility-${System.currentTimeMillis()}")
            .createDirectories()

    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "ide-build-compatibility") {
        val pluginLines =
            ideaLog.readLines().filter {
                it.contains("Nx Console") ||
                    it.contains(PLUGIN_ID) ||
                    it.contains("platform.lsp.api")
            }
        output.resolve("idea-log-nx.txt").writeText(pluginLines.joinToString("\n"))

        if (!isPluginLoaded(PLUGIN_ID)) {
            openToolWindow("Notifications")
            Thread.sleep(4000)
            val rejection =
                pluginLines.firstOrNull {
                    it.contains("requires IDE build") ||
                        it.contains("incompatible", ignoreCase = true)
                }
            val report = "IDE: $ide\nNx Console loaded: false\nRejection: $rejection\n"
            output.resolve("result.txt").writeText(report)
            println(report)
            check(rejection != null) {
                "Nx Console is not loaded in $ide, but idea.log does not say it is incompatible."
            }
            println("PASS: $ide rejects Nx Console as incompatible instead of loading it")
            return@recordIde
        }

        val version = getPlugin(PLUGIN_ID)?.getVersion()
        openToolWindow("Nx Console")
        val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
        val loading =
            ui.x(
                "//div[@class='NxToolWindowPanel']//div[@class='LoadingLayer' and @visible='true']"
            )
        val deadline = System.nanoTime() + 2.minutes.inWholeNanoseconds
        var projects = emptyList<String>()
        while (System.nanoTime() < deadline) {
            if (tree.present()) {
                projects =
                    runCatching {
                            tree.expandAll()
                            tree
                                .collectExpandedPaths()
                                .map { it.path }
                                .filter { it.size == 2 && it.first() == "Projects" }
                                .map { it[1] }
                        }
                        .getOrDefault(emptyList())
                if (projects.containsAll(EXPECTED_PROJECTS) && !loading.present()) break
            }
            Thread.sleep(1000)
        }
        Thread.sleep(3000)

        val missingClasses =
            ideaLog
                .readLines()
                .filter {
                    it.contains("NoClassDefFoundError") || it.contains("ClassNotFoundException")
                }
                .filter { it.contains("platform/lsp/api") || it.contains("platform.lsp.api") }
                .distinct()
        val report = buildString {
            appendLine("IDE: $ide")
            appendLine("Nx Console loaded: true ($version)")
            appendLine("Loading indicator still visible: ${loading.present()}")
            appendLine("Projects in tree: $projects")
            appendLine("Missing platform LSP classes in idea.log:")
            missingClasses.forEach { appendLine("  $it") }
        }
        output.resolve("result.txt").writeText(report)
        println(report)
        check(projects.containsAll(EXPECTED_PROJECTS) && !loading.present()) {
            "Nx Console $version loaded in $ide but its project tree never finished loading."
        }
        println("PASS: Nx Console $version lists $projects in $ide")
    }
}
