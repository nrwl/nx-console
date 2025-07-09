package dev.nx.console.nx_toolwindow.cloud_tree

import com.intellij.ui.tree.TreeVisitor
import com.intellij.ui.treeStructure.Tree
import javax.swing.event.TreeExpansionEvent
import javax.swing.event.TreeExpansionListener
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.TreePath

class CIPETreePersistenceManager(private val tree: Tree) {
    private val expandedPaths: MutableSet<List<String>> = mutableSetOf()

    fun installPersistenceListeners() {
        // Root is always expanded
        expandedPaths.add(listOf("cipe_root"))

        tree.addTreeExpansionListener(
            object : TreeExpansionListener {
                override fun treeExpanded(event: TreeExpansionEvent?) {
                    val path = event?.path ?: return
                    val node = getNodeFor(path) ?: return
                    expandedPaths.add(node.idPath)
                }

                override fun treeCollapsed(event: TreeExpansionEvent?) {
                    val path = event?.path ?: return
                    val node = getNodeFor(path) ?: return
                    expandedPaths.remove(node.idPath)
                }
            }
        )
    }

    private fun getNodeFor(path: TreePath): CIPESimpleNode? {
        val lastPathComponent = path.lastPathComponent
        if (lastPathComponent is DefaultMutableTreeNode) {
            val userObject = lastPathComponent.userObject
            if (userObject is CIPESimpleNode) {
                return userObject
            }
        }
        return null
    }

    inner class CIPETreePersistenceVisitor : TreeVisitor {
        override fun visit(path: TreePath): TreeVisitor.Action {
            val node = getNodeFor(path) ?: return TreeVisitor.Action.INTERRUPT

            return when {
                expandedPaths.contains(node.idPath) -> TreeVisitor.Action.CONTINUE
                else -> TreeVisitor.Action.SKIP_CHILDREN
            }
        }
    }
}
