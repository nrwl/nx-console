package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.elements.JListUiComponent
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.openapi.wm.impl.IdeFrameImpl")
interface PnpIdeFrame {
    fun setExtendedState(state: Int)

    fun toFront()

    fun getBalloonLayout(): PnpBalloonLayout
}

@Remote("com.intellij.ui.BalloonLayoutImpl")
interface PnpBalloonLayout {
    fun closeAll()
}

@Remote("com.intellij.openapi.ui.popup.util.PopupUtil")
interface PnpPopupUtil {
    fun getPopupContainerFor(component: Component): PnpPopup?
}

@Remote("com.intellij.openapi.ui.popup.JBPopup")
interface PnpPopup {
    fun cancel()
}

private const val GENERATE_UI_ACTION = "dev.nx.console.generate.actions.NxGenerateUiAction"
private const val EXPECTED_GENERATOR = "@nx/js - library"

/**
 * Opens Nx Generate (UI) in a Yarn PnP workspace that has `@nx/js` installed and checks that the
 * generator picker offers its generators. Without them, Nx Console reports "No generators found"
 * instead of opening the picker.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, PnpIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    closeToolWindow("Project")
    openToolWindow("Nx Console")

    // Precondition, not the behavior under test: nxls must have a healthy project graph, so that a
    // missing generator list cannot be blamed on a broken workspace.
    val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
    val treeDeadline = System.nanoTime() + 3.minutes.inWholeNanoseconds
    var treeRows = emptyList<String>()
    while (treeRows.none { it == "demo" } && System.nanoTime() < treeDeadline) {
        treeRows =
            runCatching {
                    tree.expandAll()
                    tree.collectExpandedPaths().mapNotNull { it.path.lastOrNull() }
                }
                .getOrDefault(emptyList())
        Thread.sleep(1000)
    }
    check(treeRows.contains("demo")) {
        "Setup failure: Nx Console did not load the workspace's projects. Tree: $treeRows"
    }

    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "pnp-generators-repro") {
        Thread.sleep(3000)
        invokeAction(GENERATE_UI_ACTION, component = frame)

        var rows = emptyList<String>()
        var popupList: JListUiComponent? = null
        val deadline = System.nanoTime() + 45.seconds.inWholeNanoseconds
        while (rows.isEmpty() && System.nanoTime() < deadline) {
            ui.xx("//div[@class='JBList']", JListUiComponent::class.java).list().forEach { list ->
                val items = runCatching { list.items }.getOrDefault(emptyList())
                if (items.any { it.contains(" - ") }) {
                    rows = items
                    popupList = list
                }
            }
            Thread.sleep(500)
        }
        // Keep the picker, or the "No generators found" balloon, on screen for the recording.
        Thread.sleep(4000)

        val output =
            automationOutput()
                .resolve("pnp-generators-${System.currentTimeMillis()}")
                .createDirectories()
        output.resolve("generators.txt").writeText(rows.joinToString("\n"))
        println("Generator picker rows (${rows.size}):\n${rows.joinToString("\n")}")

        popupList?.let { list ->
            withContext(OnDispatcher.EDT) {
                utility<PnpPopupUtil>().getPopupContainerFor(list.component)?.cancel()
            }
        }

        check(rows.isNotEmpty()) {
            "Nx Generate (UI) offered no generators in the Yarn PnP workspace."
        }
        check(rows.any { it.startsWith(EXPECTED_GENERATOR) }) {
            "The generator picker does not offer '$EXPECTED_GENERATOR'. Rows: $rows"
        }
        println("PASS: ${rows.size} generators offered, including '$EXPECTED_GENERATOR'")
    }
}
