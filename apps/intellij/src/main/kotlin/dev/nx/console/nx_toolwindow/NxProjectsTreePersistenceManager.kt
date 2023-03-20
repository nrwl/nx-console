package dev.nx.console.nx_toolwindow

import com.intellij.ui.tree.TreeVisitor
import javax.swing.event.TreeExpansionEvent
import javax.swing.event.TreeExpansionListener
import javax.swing.tree.TreePath

class NxProjectsTreePersistenceManager(private val tree: NxProjectsTree) {
    private val expandedPaths: MutableSet<List<String?>> = mutableSetOf()

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
