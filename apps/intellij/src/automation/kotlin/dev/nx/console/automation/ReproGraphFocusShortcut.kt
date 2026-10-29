package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.ActionManager
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.common.jcef
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.awt.Rectangle
import java.awt.event.InputEvent
import java.awt.event.MouseEvent
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("javax.swing.JTree")
interface ShortcutSwingTree {
    fun getRowCount(): Int

    fun getPathForRow(row: Int): ShortcutTreePath?

    fun setSelectionRow(row: Int)

    fun scrollRowToVisible(row: Int)

    fun getRowBounds(row: Int): Rectangle?

    fun dispatchEvent(event: ShortcutMouseEvent)
}

@Remote("javax.swing.tree.TreePath")
interface ShortcutTreePath {
    fun getPathCount(): Int

    fun getLastPathComponent(): ShortcutObject
}

@Remote("java.lang.Object")
interface ShortcutObject {
    override fun toString(): String
}

@Remote("java.awt.event.MouseEvent") interface ShortcutMouseEvent

@Remote("javax.swing.JMenuItem")
interface ShortcutMenuItem {
    fun getText(): String?

    fun getAccelerator(): ShortcutKeyStroke?

    fun doClick()
}

@Remote("javax.swing.KeyStroke")
interface ShortcutKeyStroke {
    override fun toString(): String
}

@Remote("javax.swing.MenuSelectionManager")
interface ShortcutMenuSelection {
    fun defaultManager(): ShortcutMenuSelection

    fun clearSelectedPath()
}

@Remote("com.intellij.openapi.actionSystem.AnAction")
interface ShortcutAction {
    fun getShortcutSet(): ShortcutSet
}

@Remote("com.intellij.openapi.actionSystem.ShortcutSet")
interface ShortcutSet {
    fun getShortcuts(): Array<ShortcutObject>
}

@Remote("com.intellij.openapi.wm.impl.IdeFrameImpl")
interface ShortcutIdeFrame {
    fun setExtendedState(state: Int)

    fun getBalloonLayout(): ShortcutBalloonLayout
}

@Remote("com.intellij.ui.BalloonLayoutImpl")
interface ShortcutBalloonLayout {
    fun closeAll()
}

private const val FOCUS_PROJECT_TEXT = "Nx Graph: Focus Project"
private const val FOCUS_PROJECT_ACTION = "dev.nx.console.graph.actions.NxGraphFocusProjectAction"

// The action falls back to this default when the keymap has no shortcut for it.
private const val EXPECTED_SHORTCUT = "[[shift ctrl pressed G]]"

/** Right-clicks a tree row through AWT events in the IDE process, without native input. */
private fun Driver.rightClickRow(tree: Component, row: Int) {
    val swingTree = cast(tree, ShortcutSwingTree::class)
    val bounds =
        withContext(OnDispatcher.EDT) {
            swingTree.scrollRowToVisible(row)
            swingTree.setSelectionRow(row)
            checkNotNull(swingTree.getRowBounds(row))
        }
    val x = bounds.x + 20
    val y = bounds.y + bounds.height / 2
    listOf(MouseEvent.MOUSE_PRESSED, MouseEvent.MOUSE_RELEASED).forEach { id ->
        val event =
            new(
                ShortcutMouseEvent::class,
                tree,
                id,
                System.currentTimeMillis(),
                InputEvent.BUTTON3_DOWN_MASK,
                x,
                y,
                1,
                true,
                MouseEvent.BUTTON3,
            )
        withContext(OnDispatcher.EDT) { swingTree.dispatchEvent(event) }
        Thread.sleep(80)
    }
}

/**
 * Opens the Nx Console tree's context menu on the demo project, checks that "Nx Graph: Focus
 * Project" shows its shortcut, then chooses it and checks that the graph focuses demo. Expects the
 * IntelliJ e2e fixture (projects demo and util).
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, ShortcutIdeFrame::class).apply {
            setExtendedState(0)
            getBalloonLayout().closeAll()
        }
    }
    closeToolWindow("Project")
    runCatching { invokeAction("CloseAllEditors", component = frame) }
    val report = StringBuilder()
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "graph-focus-shortcut"
    try {
        recordIde(label) {
            openToolWindow("Nx Console")
            val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
            val swingTree = cast(tree.component, ShortcutSwingTree::class)
            var row = -1
            waitUntil(2.minutes, { "Nx Console never listed the demo project." }) {
                runCatching { tree.expandAll() }
                row =
                    withContext(OnDispatcher.EDT) {
                        (0 until swingTree.getRowCount()).firstOrNull { index ->
                            val path = swingTree.getPathForRow(index)
                            path != null &&
                                path.getPathCount() == 3 &&
                                path.getLastPathComponent().toString() == "demo"
                        } ?: -1
                    }
                row >= 0
            }
            Thread.sleep(1500)
            rightClickRow(tree.component, row)

            var items = emptyList<Pair<String, String>>()
            waitUntil(15.seconds, { "The context menu did not list $FOCUS_PROJECT_TEXT: $items" }) {
                items =
                    ui.xx("//div[@class='ActionMenuItem']").list().map {
                        val item = cast(it.component, ShortcutMenuItem::class)
                        (item.getText() ?: "") to (item.getAccelerator()?.toString() ?: "")
                    }
                // A right-click before the tree is ready can be ignored, so open the menu again.
                if (items.isEmpty()) rightClickRow(tree.component, row)
                items.any { it.first == FOCUS_PROJECT_TEXT }
            }
            report.appendLine("Context menu: $items")
            // Updating the action for the menu applies its keymap or default shortcut.
            val shortcuts =
                withContext(OnDispatcher.EDT) {
                    val action =
                        cast(
                            checkNotNull(service<ActionManager>().getAction(FOCUS_PROJECT_ACTION)),
                            ShortcutAction::class,
                        )
                    action.getShortcutSet().getShortcuts().joinToString(prefix = "[", postfix = "]")
                }
            report.appendLine("$FOCUS_PROJECT_TEXT shortcut set: $shortcuts")
            println(report)
            Thread.sleep(2000)
            check(shortcuts == EXPECTED_SHORTCUT) {
                "$FOCUS_PROJECT_TEXT has shortcut set $shortcuts instead of $EXPECTED_SHORTCUT"
            }

            val menuItem =
                ui.xx("//div[@class='ActionMenuItem']").list().first {
                    cast(it.component, ShortcutMenuItem::class).getText() == FOCUS_PROJECT_TEXT
                }
            withContext(OnDispatcher.EDT) {
                cast(menuItem.component, ShortcutMenuItem::class).doClick()
            }

            var selected = ""
            waitUntil(1.minutes, { "The graph did not focus demo; selected: '$selected'" }) {
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
                selected == "demo"
            }
            report.appendLine("Graph selected projects: $selected")
            println("PASS: $FOCUS_PROJECT_TEXT has $shortcuts and focuses demo")
            Thread.sleep(3000)
        }
    } finally {
        runCatching {
            withContext(OnDispatcher.EDT) {
                utility<ShortcutMenuSelection>().defaultManager().clearSelectedPath()
            }
        }
        automationOutput()
            .resolve("$label-${System.currentTimeMillis()}.txt")
            .writeText(report.toString())
    }
}

private fun waitUntil(timeout: Duration, message: () -> String, condition: () -> Boolean) {
    val deadline = System.nanoTime() + timeout.inWholeNanoseconds
    while (System.nanoTime() < deadline) {
        if (runCatching(condition).getOrDefault(false)) return
        Thread.sleep(500)
    }
    error(message())
}
