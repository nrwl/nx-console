package dev.nx.console.nx_toolwindow.tree

import com.intellij.openapi.actionSystem.DataKey
import com.intellij.openapi.actionSystem.DataProvider
import com.intellij.openapi.project.Project
import com.intellij.ui.ColoredTreeCellRenderer
import com.intellij.ui.SimpleTextAttributes
import com.intellij.ui.SimpleTextAttributes.STYLE_SMALLER
import com.intellij.ui.treeStructure.SimpleTree
import com.intellij.util.ui.NamedColorUtil
import com.intellij.util.ui.tree.TreeUtil
import dev.nx.console.models.NxProject
import dev.nx.console.utils.sync_services.NxCloudStatusSyncAccessService
import javax.swing.JTree
import javax.swing.UIManager
import javax.swing.tree.TreeSelectionModel

val NxTreeNodeKey = DataKey.create<NxSimpleNode?>("NX_TREE_NODE")

val NxTreeNodeProjectKey = DataKey.create<NxProject?>("NX_TREE_NODE_PROJECT")

class NxProjectsTree(project: Project) : SimpleTree(), DataProvider {
    init {
        isRootVisible = false
        showsRootHandles = true
        emptyText.text = "There are no nx projects to display."
        selectionModel.selectionMode = TreeSelectionModel.SINGLE_TREE_SELECTION

        setCellRenderer(AtomizerTreeCellRenderer(project))
    }

    override fun getData(dataId: String): Any? {
        if (NxTreeNodeKey.`is`(dataId)) {
            return selectedNode as? NxSimpleNode
        }
        if (NxTreeNodeProjectKey.`is`(dataId)) {
            val nxSimpleNode = selectedNode as? NxSimpleNode ?: return null
            return nxSimpleNode.nxProject
        }
        return null
    }

    class AtomizerTreeCellRenderer(private val project: Project) : ColoredTreeCellRenderer() {
        private val nxCloudSyncService = NxCloudStatusSyncAccessService.getInstance(project)

        override fun customizeCellRenderer(
            tree: JTree,
            value: Any?,
            selected: Boolean,
            expanded: Boolean,
            leaf: Boolean,
            row: Int,
            hasFocus: Boolean
        ) {
            val node = TreeUtil.getUserObject(value) as NxSimpleNode

            icon = node.icon
            append(node.name, SimpleTextAttributes.REGULAR_ATTRIBUTES, true)

            if (node is NxSimpleNode.Target && node.nonAtomizedTarget != null) {
                val isConnected = nxCloudSyncService.cloudStatus?.isConnected ?: true
                append(
                    "  Atomizer",
                    SimpleTextAttributes(
                        STYLE_SMALLER,
                        if (isConnected) NamedColorUtil.getInactiveTextColor()
                        else UIManager.getColor("Tree.errorForeground")
                    ),
                    false
                )
                toolTipText =
                    "Nx automatically split the potentially slow ${node.nonAtomizedTarget} task into separate tasks for each file. Enable ${if(isConnected) "Nx Agents" else "Nx Cloud"} to benefit from task distribution and flaky task re-runs."
            } else {
                toolTipText = null
            }
        }
    }
}
