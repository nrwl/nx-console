package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes

@Remote("com.intellij.openapi.wm.impl.IdeFrameImpl")
interface FolderTreeIdeFrame {
    fun setExtendedState(state: Int)

    fun toFront()

    fun getBalloonLayout(): FolderTreeBalloonLayout
}

@Remote("com.intellij.ui.BalloonLayoutImpl")
interface FolderTreeBalloonLayout {
    fun closeAll()
}

@Remote("javax.swing.JTree")
interface FolderTreeSwingTree {
    fun setSelectionRow(row: Int)

    fun scrollRowToVisible(row: Int)
}

private const val AGGREGATOR = "packages-aggregator"
private const val AGGREGATOR_DIR = "packages"

private fun Driver.expandedPaths(tree: JTreeUiComponent): List<List<String>> {
    tree.expandAll()
    return tree.collectExpandedPaths().map { it.path }
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    withContext(OnDispatcher.EDT) {
        cast(ui.x("//div[@class='IdeFrameImpl']").component, FolderTreeIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    closeToolWindow("Project")
    openToolWindow("Nx Console")

    val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)

    // The tree is filled from an async nxls request and each level of children is resolved
    // lazily, so expanding once is not enough to see the whole tree.
    val deadline = System.nanoTime() + 3.minutes.inWholeNanoseconds
    var paths = emptyList<List<String>>()
    while (System.nanoTime() < deadline) {
        val current = runCatching { expandedPaths(tree) }.getOrDefault(emptyList())
        if (current.size >= 13 && current == paths) break
        paths = current
        Thread.sleep(1000)
    }

    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "issue-folder-tree-roots-repro") {
        paths = expandedPaths(tree)
        val topLevel = paths.filter { it.size == 2 && it.first() == "Projects" }.map { it[1] }

        // Bring the node under test on screen so the recording shows it, whichever way it
        // rendered. Everything below is asserted on the collected paths, not on the frame.
        val onScreen = listOf(AGGREGATOR, AGGREGATOR_DIR).firstOrNull { topLevel.contains(it) }
        if (onScreen != null) {
            withContext(OnDispatcher.EDT) {
                val row =
                    checkNotNull(tree.findExpandedPath("Projects", onScreen, fullMatch = true)).row
                cast(tree.component, FolderTreeSwingTree::class).apply {
                    scrollRowToVisible(row + 3)
                    scrollRowToVisible(row)
                    setSelectionRow(row)
                }
            }
        }
        Thread.sleep(4000)

        val output =
            automationOutput()
                .resolve("folder-tree-${System.currentTimeMillis()}")
                .createDirectories()
        output.resolve("tree.txt").writeText(paths.joinToString("\n") { it.joinToString(" / ") })
        println("Nx Console tree:\n${paths.joinToString("\n") { it.joinToString(" / ") }}")

        check(topLevel.isNotEmpty()) { "The Projects section rendered no top-level nodes." }
        check(!topLevel.contains(AGGREGATOR_DIR)) {
            "The project rooted at '$AGGREGATOR_DIR' is rendered as the folder '$AGGREGATOR_DIR'. " +
                "Top-level nodes: $topLevel"
        }
        check(topLevel.contains(AGGREGATOR)) {
            "The project rooted at '$AGGREGATOR_DIR' is missing from the tree as '$AGGREGATOR'. " +
                "Top-level nodes: $topLevel"
        }

        val underAggregator =
            paths
                .filter { it.size == 3 && it[0] == "Projects" && it[1] == AGGREGATOR }
                .map { it[2] }
        check(underAggregator.contains("hello")) {
            "'$AGGREGATOR' does not offer its 'hello' target. Children: $underAggregator"
        }
        listOf("child-a", "child-b").forEach { child ->
            check(underAggregator.contains(child)) {
                "'$AGGREGATOR' lost its nested project '$child'. Children: $underAggregator"
            }
        }
        println("PASS: '$AGGREGATOR' renders as a project with $underAggregator")
    }
}
