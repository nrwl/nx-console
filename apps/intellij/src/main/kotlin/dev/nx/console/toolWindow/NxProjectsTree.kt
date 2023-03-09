package dev.nx.console.toolWindow

import com.intellij.ui.treeStructure.SimpleTree
import javax.swing.tree.TreeSelectionModel

class NxProjectsTree : SimpleTree() {
    init {
        isRootVisible = true
        showsRootHandles = true
        emptyText.text = "There are no nx projects to display."
        selectionModel.selectionMode = TreeSelectionModel.SINGLE_TREE_SELECTION
    }
}
