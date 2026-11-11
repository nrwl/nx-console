package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.awt.event.InputEvent
import java.awt.event.MouseEvent
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("javax.swing.JTree")
interface RiderExpandableTree {
    fun expandRow(row: Int)
}

@Remote("com.intellij.ide.projectView.ProjectView")
interface RiderProjectView {
    fun changeView(viewId: String)
}

@Remote("javax.swing.JMenuItem")
interface RiderMenuItem {
    fun getText(): String?

    fun isEnabled(): Boolean

    fun isVisible(): Boolean

    fun doClick()
}

private fun Driver.riderPopup(tree: JTreeUiComponent, row: Int) {
    val swing = cast(tree.component, ShortcutSwingTree::class)
    val bounds =
        withContext(OnDispatcher.EDT) {
            swing.setSelectionRow(row)
            swing.scrollRowToVisible(row)
            checkNotNull(swing.getRowBounds(row))
        }
    listOf(MouseEvent.MOUSE_PRESSED, MouseEvent.MOUSE_RELEASED).forEach { id ->
        val event =
            new(
                ShortcutMouseEvent::class,
                tree.component,
                id,
                System.currentTimeMillis(),
                InputEvent.BUTTON3_DOWN_MASK,
                bounds.x + 20,
                bounds.y + bounds.height / 2,
                1,
                true,
                MouseEvent.BUTTON3,
            )
        withContext(OnDispatcher.EDT) { swing.dispatchEvent(event) }
    }
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "issue-2169-repro"
    val report = StringBuilder("IDE: ${getProductVersion()}\n")
    try {
        val view = System.getenv("NX_RIDER_VIEW") ?: "SolutionExplorer"
        if (System.getenv("NX_RIDER_VIEW") != null) {
            withContext(OnDispatcher.EDT) {
                service<RiderProjectView>(getOpenProjects().single()).changeView(view)
            }
        }
        report.appendLine("Requested view: $view")
        recordIde(label) {
            val frame = ui.x("//div[@class='IdeFrameImpl']").component
            withContext(OnDispatcher.EDT) {
                cast(frame, ShortcutIdeFrame::class).getBalloonLayout().closeAll()
            }
            val tree = ui.x("//div[@class='SolutionViewTree']", JTreeUiComponent::class.java)
            val swing = cast(tree.component, ShortcutSwingTree::class)
            var row = -1
            val deadline = System.nanoTime() + 1.minutes.inWholeNanoseconds
            while (row < 0 && System.nanoTime() < deadline) {
                withContext(OnDispatcher.EDT) {
                    if (swing.getRowCount() > 0) {
                        // Only expand the root; project dependencies can contain thousands of
                        // nodes.
                        cast(tree.component, RiderExpandableTree::class).expandRow(0)
                    }
                }
                row =
                    withContext(OnDispatcher.EDT) {
                        (0 until swing.getRowCount()).firstOrNull {
                            swing.getPathForRow(it)?.getLastPathComponent().toString() == "demo"
                        } ?: -1
                    }
                if (row < 0) Thread.sleep(250)
            }
            report.appendLine("Expanded paths: ${tree.collectExpandedPaths().take(20)}")
            check(row >= 0) { "No demo project node: $report" }
            val project = getOpenProjects().single()
            val editors = service<NxlsEditors>(project)
            if (editors.getOpenFiles().isNotEmpty())
                invokeAction("CloseAllEditors", component = frame)
            riderPopup(tree, row)
            var items = emptyList<Triple<String, Boolean, Boolean>>()
            val popupDeadline = System.nanoTime() + 15.seconds.inWholeNanoseconds
            while (System.nanoTime() < popupDeadline) {
                items =
                    ui.xx("//div[@class='ActionMenuItem']")
                        .list()
                        .filter { it.component.isShowing() }
                        .map {
                            val item = cast(it.component, RiderMenuItem::class)
                            Triple(item.getText() ?: "", item.isEnabled(), item.isVisible())
                        }
                if (items.isNotEmpty()) break
                Thread.sleep(250)
            }
            report.appendLine("Actual context menu (text, enabled, visible): $items")
            inspectIde()
            captureIdeWindows("$label-menu-${System.currentTimeMillis()}").forEach {
                report.appendLine("Popup screenshot: $it")
            }
            Thread.sleep(2000)
            val expected =
                listOf(
                    "Nx Generate (UI)",
                    "Nx: Run Target",
                    "Nx: Show Project Configuration",
                    "Move Nx Project",
                    "Remove Nx Project",
                )
            expected.forEach { text ->
                val matches = items.filter { it.first == text }
                check(matches.size == 1 && matches.single().second && matches.single().third) {
                    "Expected one enabled and visible '$text' in Rider project context menu: $items"
                }
            }
            val configuration =
                ui.xx("//div[@class='ActionMenuItem']")
                    .list()
                    .filter { it.component.isShowing() }
                    .single {
                        cast(it.component, RiderMenuItem::class).getText() ==
                            "Nx: Show Project Configuration"
                    }
            withContext(OnDispatcher.EDT) {
                cast(configuration.component, RiderMenuItem::class).doClick()
            }
            val editorDeadline = System.nanoTime() + 1.minutes.inWholeNanoseconds
            while (
                System.nanoTime() < editorDeadline &&
                    editors.getOpenFiles().none { it.getPath().endsWith("/demo/project.json") }
            ) {
                Thread.sleep(250)
            }
            check(editors.getOpenFiles().any { it.getPath().endsWith("/demo/project.json") }) {
                "Show Project Configuration did not open demo/project.json"
            }
            report.appendLine("PASS: menu action opened demo/project.json")
            Thread.sleep(2000)
        }
    } finally {
        automationOutput().resolve("$label-menu.txt").writeText(report.toString())
        withContext(OnDispatcher.EDT) {
            utility<ShortcutMenuSelection>().defaultManager().clearSelectedPath()
        }
    }
}
