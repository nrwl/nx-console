package dev.nx.console.nx_toolwindow.tree

import com.intellij.ui.tree.TreeVisitor
import java.awt.Point
import javax.swing.event.TreeExpansionEvent
import javax.swing.event.TreeExpansionListener
import javax.swing.tree.TreePath

class NxTreePersistenceManager(private val tree: NxProjectsTree) {
    private val expandedPaths: MutableSet<List<String?>> = mutableSetOf()
    private var savedScrollPosition: Point? = null

    fun installPersistenceListeners() {
        expandedPaths.add(listOf(null))
        tree.addTreeExpansionListener(
            object : TreeExpansionListener {
                override fun treeExpanded(event: TreeExpansionEvent?) {
                    if (event?.path == null) {
                        return
                    }
                    val node = tree.getNodeFor(event.path)
                    if (node !is NxSimpleNode) {
                        return
                    }
                    expandedPaths.add(node.idPath)
                }

                override fun treeCollapsed(event: TreeExpansionEvent?) {
                    if (event?.path == null) {
                        return
                    }
                    val node = tree.getNodeFor(event.path)
                    if (node !is NxSimpleNode) {
                        return
                    }
                    expandedPaths.remove(node.idPath)
                }
            }
        )
    }

    fun saveScrollPosition() {
        val viewport = findViewport()
        if (viewport != null) {
            val currentPosition = viewport.viewPosition
            savedScrollPosition = Point(currentPosition)
        }
    }

    fun restoreScrollPosition() {
        val viewport = findViewport()
        savedScrollPosition?.let { position -> viewport?.viewPosition = position }
    }

    private fun findViewport(): javax.swing.JViewport? {
        var component = tree.parent
        var level = 0
        while (component != null && level < 5) {
            if (component is javax.swing.JViewport) {
                return component
            }
            component = component.parent
            level++
        }
        return null
    }

    inner class NxProjectsTreePersistenceVisitor : TreeVisitor {
        override fun visit(path: TreePath): TreeVisitor.Action {
            val node = tree.getNodeFor(path)
            if (node !is NxSimpleNode) {
                return TreeVisitor.Action.INTERRUPT
            }
            return when (expandedPaths.contains(node.idPath)) {
                true -> TreeVisitor.Action.CONTINUE
                else -> TreeVisitor.Action.SKIP_CHILDREN
            }
        }
    }
}
