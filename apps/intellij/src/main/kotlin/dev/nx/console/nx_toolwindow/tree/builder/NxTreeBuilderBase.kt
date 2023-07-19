package dev.nx.console.nx_toolwindow.tree.builder

import dev.nx.console.models.NxProject
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode

abstract class NxTreeBuilderBase(private val nxWorkspace: NxWorkspace?) {

    abstract fun buildChildren(node: NxSimpleNode): Array<NxSimpleNode>

    fun buildRootNode(): NxSimpleNode.Root {
        val rootName = nxWorkspace?.workspacePath?.substringAfterLast("/") ?: "nx-workspace"
        return NxSimpleNode.Root(rootName, this)
    }

    fun getNxProjectForNode(node: NxSimpleNode): NxProject? {
        if (nxWorkspace == null) {
            return null
        }
        if (node is NxSimpleNode.Target) {
            return nxWorkspace.workspace.projects[node.nxProjectName]
        }
        if (node is NxSimpleNode.TargetConfiguration) {
            return nxWorkspace.workspace.projects[node.nxProjectName]
        }
        if (node is NxSimpleNode.Project) {
            return nxWorkspace.workspace.projects[node.nxProjectName]
        }
        return null
    }

    protected fun getProjectsAndTargetsSections(rootNode: NxSimpleNode.Root): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        val targetsSection: Array<NxSimpleNode> = arrayOf(NxSimpleNode.TargetsSection(rootNode))
        val projectsSection: Array<NxSimpleNode> = arrayOf(NxSimpleNode.ProjectsSection(rootNode))

        return projectsSection + targetsSection
    }

    fun getTargetGroups(targetsSectionNode: NxSimpleNode.TargetsSection): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        return nxWorkspace.workspace.projects.values
            .flatMap { p -> p.targets.keys.map { it to p.name } }
            .groupBy { it.first }
            .toSortedMap()
            .map { NxSimpleNode.TargetGroup(it.key, targetsSectionNode) }
            .toTypedArray()
    }

    fun getTargetListForTargetGroup(
        targetGroupNode: NxSimpleNode.TargetGroup
    ): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        return nxWorkspace.workspace.projects
            .filter { it.value.targets.contains(targetGroupNode.targetName) }
            .map {
                NxSimpleNode.Target(
                    displayName = it.key,
                    nxTargetName = targetGroupNode.targetName,
                    nxProjectName = it.value.name,
                    parent = targetGroupNode
                )
            }
            .toTypedArray()
    }

    protected fun getTargetConfigurations(targetNode: NxSimpleNode.Target): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        return nxWorkspace.workspace.projects[targetNode.nxProjectName]
            ?.targets
            ?.get(targetNode.nxTargetName)
            ?.configurations
            ?.keys
            ?.map {
                NxSimpleNode.TargetConfiguration(
                    nxTargetConfigurationName = it,
                    nxTargetName = targetNode.nxTargetName,
                    nxProjectName = targetNode.nxProjectName,
                    parent = targetNode
                )
            }
            ?.toTypedArray()
            ?: emptyArray()
    }

    protected fun getTargetListForProject(projectNode: NxSimpleNode.Project): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        val nxProject =
            nxWorkspace.workspace.projects[projectNode.nxProjectName] ?: return emptyArray()
        return nxProject.targets
            .map {
                NxSimpleNode.Target(
                    displayName = it.key,
                    nxTargetName = it.key,
                    nxProjectName = projectNode.nxProjectName,
                    parent = projectNode
                )
            }
            .toTypedArray()
    }
}
