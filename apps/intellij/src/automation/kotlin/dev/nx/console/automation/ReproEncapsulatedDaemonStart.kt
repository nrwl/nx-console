package dev.nx.console.automation

import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.jdk.getSystemProperty
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.common.popups.searchEverywherePopup
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.remote.SwingHierarchyService
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit
import kotlin.io.path.copyTo
import kotlin.io.path.createDirectories
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val root = Path.of(project.getBasePath())
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "encapsulated-daemon"
    val output = automationOutput().resolve(label).createDirectories()
    val frame = nxlsFrame()
    val log = Path.of(getSystemProperty("idea.log.path"), "idea.log")
    val offset = log.readText().length
    val report = StringBuilder("IDE: ${getProductVersion()}\nFixture: $root\n")
    fun tree(): String =
        runCatching {
                val t = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
                if (!t.present()) "NO TREE"
                else {
                    t.expandAll()
                    t.collectExpandedPaths().map { it.path }.toString()
                }
            }
            .getOrElse { it.toString() }
    fun snapshot(stage: String) {
        report.appendLine("$stage TREE: ${tree()}")
        output
            .resolve("$stage.html")
            .writeText(service<SwingHierarchyService>().getSwingHierarchyAsDOM(null, false))
        captureIdeWindows("$label-$stage-${System.currentTimeMillis()}").forEach {
            it.copyTo(output.resolve("$stage-${it.fileName}"), true)
        }
    }
    fun search(): List<String> {
        invokeAction("SearchEverywhere", component = frame)
        val popup = ui.searchEverywherePopup()
        nxlsWait(10.seconds, { "Search missing" }) { popup.searchField.present() }
        withContext(OnDispatcher.EDT) {
            cast(popup.searchField.component, GeneratorSearchField::class).setText("demo hello")
        }
        nxlsWait(30.seconds, { "demo:hello absent from Search Everywhere" }) {
            popup.resultsList.present() &&
                popup.resultsList.items.any { it.contains("demo:hello Nx target") }
        }
        val rows = popup.resultsList.items
        snapshot("search-${System.currentTimeMillis()}")
        withContext(OnDispatcher.EDT) {
            utility<GeneratorSearchPopupUtil>()
                .getPopupContainerFor(popup.searchField.component)
                ?.cancel()
        }
        return rows
    }
    recordIde(label) {
        try {
            check(Files.exists(root.resolve(".nx/installation/node_modules/nx/package.json")))
            check(!Files.exists(root.resolve("node_modules/nx")))
            openToolWindow("Nx Console")
            snapshot("before")
            val stop =
                ProcessBuilder("./nx", "daemon", "--stop")
                    .directory(root.toFile())
                    .redirectErrorStream(true)
                    .redirectOutput(output.resolve("daemon-stop.log").toFile())
            stop.environment().remove("CI")
            stop.environment().remove("NX_DAEMON")
            stop.environment()["NX_SOCKET_DIR"] =
                checkNotNull(utility<LifecycleEnvironment>().getenv("NX_SOCKET_DIR"))
            val process = stop.start()
            check(process.waitFor(60, TimeUnit.SECONDS) && process.exitValue() == 0) {
                "Could not stop fixture daemon"
            }
            invokeAction("dev.nx.console.nxls.NxRefreshWorkspaceAction", component = frame)
            nxlsWait(90.seconds, { "Cold daemon startup did not settle: ${tree()}" }) {
                ui.x("//div[@class='JButton' and @text='View Errors']").present() ||
                    (log.readText().drop(offset).contains("Nx daemon started") &&
                        tree().contains("demo, hello") &&
                        tree().contains("util"))
            }
            check(!ui.x("//div[@class='JButton' and @text='View Errors']").present()) {
                "Cold daemon startup shows workspace errors instead of projects: ${tree()}"
            }
            snapshot("projects-loaded")
            report.appendLine("SEARCH: ${search()}")
            val newLog = log.readText().drop(offset)
            check(newLog.contains("./nx daemon --start")) {
                "Wrapper startup command absent from idea.log"
            }
            report.appendLine(
                "PASS: cold startup loaded projects and demo:hello through the encapsulated wrapper"
            )
        } finally {
            runCatching { snapshot("result") }
            output.resolve("observations.txt").writeText(report.toString())
            output.resolve("idea-new.log").writeText(log.readText().drop(offset))
            println(report)
        }
    }
}
