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
        if (node is NxSimpleNode.TargetGroup) {
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

    protected fun getTargetsAndTargetGroupsForProject(
        projectNode: NxSimpleNode.Project
    ): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        val nxProject =
            nxWorkspace.workspace.projects[projectNode.nxProjectName] ?: return emptyArray()

        val targetGroups = nxProject.metadata?.targetGroups

        if (targetGroups == null) {
            return nxProject.targets
                .map {
                    NxSimpleNode.Target(
                        displayName = it.key,
                        nxTargetName = it.key,
                        nxProjectName = projectNode.nxProjectName,
                        nonAtomizedTarget = it.value.metadata?.nonAtomizedTarget,
                        parent = projectNode
                    )
                }
                .toTypedArray()
        } else {
            val targetGroupMap = mutableMapOf<String, MutableList<String>>()
            val nonGroupedTargets: MutableSet<String> = nxProject.targets.keys.toMutableSet()

            for ((targetGroupName, targets) in targetGroups) {
                if (!targetGroupMap.containsKey(targetGroupName)) {
                    targetGroupMap[targetGroupName] = mutableListOf()
                }
                for (target in targets) {
                    targetGroupMap[targetGroupName]?.add(target)
                    nonGroupedTargets.remove(target)
                }
            }

            return targetGroupMap
                .map<String, MutableList<String>, NxSimpleNode> {
                    NxSimpleNode.TargetGroup(
                        targetGroupName = it.key,
                        nxProjectName = projectNode.nxProjectName,
                        targets = it.value.toTypedArray(),
                        parent = projectNode
                    )
                }
                .toTypedArray() +
                nonGroupedTargets
                    .sorted()
                    .map<String, NxSimpleNode> {
                        NxSimpleNode.Target(
                            displayName = it,
                            nxTargetName = it,
                            nxProjectName = projectNode.nxProjectName,
                            parent = projectNode
                        )
                    }
                    .toTypedArray()
        }
    }

    protected fun getTargetsForTargetGroup(
        targetGroupNode: NxSimpleNode.TargetGroup
    ): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        val nxProject =
            nxWorkspace.workspace.projects[targetGroupNode.nxProjectName] ?: return emptyArray()
        return nxProject.targets
            .filter { targetGroupNode.targets.contains(it.key) }
            .map {
                NxSimpleNode.Target(
                    displayName = it.key,
                    nxTargetName = it.key,
                    nxProjectName = targetGroupNode.nxProjectName,
                    nonAtomizedTarget = it.value.metadata?.nonAtomizedTarget,
                    parent = targetGroupNode
                )
            }
            .sortedBy { it.displayName }
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

    protected fun getTargetsList(
        targetsSectionNode: NxSimpleNode.TargetsSection
    ): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        return nxWorkspace.workspace.projects.values
            .flatMap { p -> p.targets.keys.map { it to p.name } }
            .groupBy { it.first }
            .toSortedMap()
            .map { NxSimpleNode.TargetsList(it.key, targetsSectionNode) }
            .toTypedArray()
    }

    protected fun getTargetsForTargetsList(
        targetsListNode: NxSimpleNode.TargetsList
    ): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        return nxWorkspace.workspace.projects
            .filter { it.value.targets.contains(targetsListNode.targetName) }
            .map {
                NxSimpleNode.Target(
                    displayName = it.key,
                    nxTargetName = targetsListNode.targetName,
                    nxProjectName = it.value.name,
                    parent = targetsListNode
                )
            }
            .toTypedArray()
    }
}
