package dev.nx.console.nx_toolwindow.cloud_tree

import com.intellij.ui.tree.TreeVisitor
import javax.swing.event.TreeExpansionEvent
import javax.swing.event.TreeExpansionListener
import javax.swing.tree.TreePath

class CIPETreePersistenceManager(private val tree: CIPETree) {
    private val expandedPaths: MutableSet<List<String>> = mutableSetOf()

    fun installPersistenceListeners() {
        // Root is always expanded
        expandedPaths.add(listOf("cipe_root"))

        tree.addTreeExpansionListener(
            object : TreeExpansionListener {
                override fun treeExpanded(event: TreeExpansionEvent?) {
                    val path = event?.path ?: return
                    val node = tree.getNodeFor(path) ?: return
                    if (node !is CIPESimpleNode) {
                        return
                    }
                    expandedPaths.add(node.idPath)
                }

                override fun treeCollapsed(event: TreeExpansionEvent?) {
                    val path = event?.path ?: return
                    val node = tree.getNodeFor(path) ?: return
                    if (node !is CIPESimpleNode) {
                        return
                    }
                    expandedPaths.remove(node.idPath)
                }
            }
        )
    }

    inner class CIPETreePersistenceVisitor : TreeVisitor {
        override fun visit(path: TreePath): TreeVisitor.Action {
            val node = tree.getNodeFor(path) ?: return TreeVisitor.Action.INTERRUPT

            return when {
                node is CIPESimpleNode && expandedPaths.contains(node.idPath) ->
                    TreeVisitor.Action.CONTINUE
                else -> TreeVisitor.Action.SKIP_CHILDREN
            }
        }
    }
}
