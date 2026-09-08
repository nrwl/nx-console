package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.getPlugin
import com.intellij.driver.sdk.getToolWindow
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes

fun main() = withAutomationDriver {
    var failure: Throwable? = null
    try {
        waitForProjectOpen(3.minutes)
        val expectedWorkspace = Path.of(System.getenv("NX_AUTOMATION_PROJECT")).toRealPath()
        check(getOpenProjects().single().getBasePath() == expectedWorkspace.toString()) {
            "The IDE did not open the e2e fixture."
        }
        if (System.getenv("NX_E2E_EXTERNAL_VIDEO") == "true") {
            checkProjectView()
        } else {
            recordIde("project-view") { checkProjectView() }
        }
    } catch (error: Throwable) {
        failure = error
        automationOutput().resolve("test-failure.txt").writeText(error.stackTraceToString())
        throw error
    } finally {
        try {
            inspectIde()
        } catch (error: Throwable) {
            if (failure == null) throw error else failure.addSuppressed(error)
        }
    }
}

private fun Driver.checkProjectView() {
    check(getPlugin("dev.nx.console")?.isEnabled() == true) {
        "Nx Console is disabled. Check ide.log for missing dependencies and ensure IntelliJ IDEA is activated."
    }
    openToolWindow("Nx Console")
    val expectedProject = System.getenv("NX_E2E_EXPECTED_PROJECT") ?: "demo"
    val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
    val loading =
        ui.x(
            "//div[@class='JBLoadingPanel'][.//div[@class='NxProjectsTree']]" +
                "//div[@class='LoadingLayer' and @visible='true']"
        )
    val deadline = System.nanoTime() + 2.minutes.inWholeNanoseconds
    var paths = ""
    while (System.nanoTime() < deadline) {
        if (tree.present()) {
            tree.expandAll()
            paths = tree.collectExpandedPaths().toString()
            if (
                tree.findExpandedPath(expectedProject, "hello", fullMatch = false) != null &&
                    !loading.present()
            ) {
                withContext(OnDispatcher.EDT) {
                    check(getToolWindow("Nx Console").isVisible())
                    check(tree.component.isShowing())
                    check(tree.component.width > 0 && tree.component.height > 0)
                }
                // Hold the asserted view long enough to review in the recording.
                Thread.sleep(2000)
                automationOutput().resolve("project-view.txt").writeText("PASS\n$paths\n")
                println(
                    "PASS: Nx Console renders project $expectedProject and its hello target: $paths"
                )
                return
            }
        }
        Thread.sleep(500)
    }
    error(
        "Nx Console did not render project $expectedProject and its hello target. Visible paths: $paths"
    )
}
