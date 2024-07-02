package dev.nx.console.nx_toolwindow.tree.builder

import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode

class NxListTreeBuilder(private val nxWorkspace: NxWorkspace?) : NxTreeBuilderBase(nxWorkspace) {
    override fun buildChildren(node: NxSimpleNode): Array<NxSimpleNode> {
        if (node is NxSimpleNode.Root) {
            return getProjectsAndTargetsSections(node)
        }
        if (node is NxSimpleNode.TargetsSection) {
            return getTargetsList(node)
        }
        if (node is NxSimpleNode.TargetsList) {
            return getTargetsForTargetsList(node)
        }
        if (node is NxSimpleNode.Target) {
            return getTargetConfigurations(node)
        }
        if (node is NxSimpleNode.ProjectsSection) {
            return getProjectList(node)
        }
        if (node is NxSimpleNode.TargetGroup) {
            return getTargetsForTargetGroup(node)
        }
        if (node is NxSimpleNode.Project) {
            return getTargetsAndTargetGroupsForProject(node)
        }

        return emptyArray()
    }

    private fun getProjectList(
        projectsSectionNode: NxSimpleNode.ProjectsSection
    ): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        return nxWorkspace.workspace.projects.values
            .map { NxSimpleNode.Project(it.name, projectsSectionNode) }
            .toTypedArray()
    }
}
