package dev.nx.console.nx_toolwindow.tree.builder

import dev.nx.console.models.NxFolderTreeData
import dev.nx.console.models.NxTreeNode
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode

class NxFolderTreeBuilder(
    private val nxWorkspace: NxWorkspace?,
    private val nxFolderTreeData: NxFolderTreeData?
) : NxTreeBuilderBase(nxWorkspace) {

    override fun buildChildren(node: NxSimpleNode): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        if (nxFolderTreeData == null) {
            return emptyArray()
        }
        if (node is NxSimpleNode.Root) {
            return getProjectsAndTargetsSections(node)
        }
        if (node is NxSimpleNode.ProjectsSection) {
            return nxFolderTreeData.roots.map { createFolderOrProjectNode(it, node) }.toTypedArray()
        }
        if (node is NxSimpleNode.Folder) {
            val children = nxFolderTreeData.treeMap[node.path]?.children ?: return emptyArray()
            return children
                .mapNotNull { nxFolderTreeData.treeMap[it] }
                .map { createFolderOrProjectNode(it, node) }
                .toTypedArray()
        }
        if (node is NxSimpleNode.Project) {
            val targetChildren = getTargetsAndTargetGroupsForProject(node)
            val folderChildren =
                node.nxProject
                    ?.root
                    ?.let { nxFolderTreeData.treeMap[it]?.children }
                    ?.mapNotNull { nxFolderTreeData.treeMap[it] }
                    ?.map { createFolderOrProjectNode(it, node) }
                    ?.toTypedArray()
                    ?: return targetChildren
            return targetChildren + folderChildren
        }
        if (node is NxSimpleNode.Target) {
            return getTargetConfigurations(node)
        }
        if (node is NxSimpleNode.TargetsSection) {
            return getTargetsList(node)
        }
        if (node is NxSimpleNode.TargetsList) {
            return getTargetsForTargetsList(node)
        }
        if (node is NxSimpleNode.TargetGroup) {
            return getTargetsForTargetGroup(node)
        }
        return emptyArray()
    }

    private fun createFolderOrProjectNode(
        nxTreeNode: NxTreeNode,
        parent: NxSimpleNode,
    ): NxSimpleNode {
        nxTreeNode.projectConfiguration.let {
            if (it === null) {
                return NxSimpleNode.Folder(nxTreeNode.dir, parent)
            }

            return NxSimpleNode.Project(it.name, parent)
        }
    }
}
