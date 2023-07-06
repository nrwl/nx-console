package dev.nx.console.nx_toolwindow.tree

import com.intellij.openapi.actionSystem.DataKey
import com.intellij.openapi.actionSystem.DataProvider
import com.intellij.ui.treeStructure.SimpleTree
import dev.nx.console.models.NxProject
import javax.swing.tree.TreeSelectionModel

val NxTreeNodeKey = DataKey.create<NxSimpleNode?>("NX_TREE_NODE")

val NxTreeNodeProjectKey = DataKey.create<NxProject?>("NX_TREE_NODE_PROJECT")

class NxProjectsTree : SimpleTree(), DataProvider {
    init {
        isRootVisible = true
        showsRootHandles = true
        emptyText.text = "There are no nx projects to display."
        selectionModel.selectionMode = TreeSelectionModel.SINGLE_TREE_SELECTION
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
}
