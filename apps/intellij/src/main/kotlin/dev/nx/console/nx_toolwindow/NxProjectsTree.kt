package dev.nx.console.nx_toolwindow

import com.intellij.openapi.actionSystem.DataKey
import com.intellij.openapi.actionSystem.DataProvider
import com.intellij.ui.treeStructure.SimpleTree
import javax.swing.tree.TreeSelectionModel

val NxTreeNodeKey = DataKey.create<NxSimpleNode?>("NX_TREE_NODE")

class NxProjectsTree : SimpleTree(), DataProvider {
    init {
        isRootVisible = true
        showsRootHandles = true
        emptyText.text = "There are no nx projects to display."
        selectionModel.selectionMode = TreeSelectionModel.SINGLE_TREE_SELECTION
    }

    override fun getData(dataId: String): Any? {
        if (NxTreeNodeKey.`is`(dataId)) {
            return selectedNode
        }
        return null
    }
}
