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
            return nxWorkspace.projectGraph?.nodes?.get(node.nxProjectName)?.data
        }
        if (node is NxSimpleNode.TargetConfiguration) {
            return nxWorkspace.projectGraph?.nodes?.get(node.nxProjectName)?.data
        }
        if (node is NxSimpleNode.TargetGroup) {
            return nxWorkspace.projectGraph?.nodes?.get(node.nxProjectName)?.data
        }
        if (node is NxSimpleNode.Project) {
            return nxWorkspace.projectGraph?.nodes?.get(node.nxProjectName)?.data
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
            nxWorkspace.projectGraph?.nodes?.get(projectNode.nxProjectName)?.data
                ?: return emptyArray()

        val targetGroups = nxProject.metadata?.targetGroups

        if (targetGroups == null) {
            return nxProject.targets
                ?.map {
                    NxSimpleNode.Target(
                        displayName = it.key,
                        nxTargetName = it.key,
                        nxProjectName = projectNode.nxProjectName,
                        nonAtomizedTarget = it.value.metadata?.nonAtomizedTarget,
                        parent = projectNode,
                    )
                }
                ?.toTypedArray()
                ?: emptyArray()
        } else {
            val targetGroupMap = mutableMapOf<String, MutableList<String>>()
            val nonGroupedTargets: MutableSet<String> =
                nxProject.targets?.keys?.toMutableSet() ?: mutableSetOf()

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
                        parent = projectNode,
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
                            parent = projectNode,
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
            nxWorkspace.projectGraph?.nodes?.get(targetGroupNode.nxProjectName)?.data
                ?: return emptyArray()
        return nxProject.targets
            ?.filter { targetGroupNode.targets.contains(it.key) }
            ?.map {
                NxSimpleNode.Target(
                    displayName = it.key,
                    nxTargetName = it.key,
                    nxProjectName = targetGroupNode.nxProjectName,
                    nonAtomizedTarget = it.value.metadata?.nonAtomizedTarget,
                    parent = targetGroupNode,
                )
            }
            ?.sortedBy { it.displayName }
            ?.toTypedArray()
            ?: emptyArray()
    }

    protected fun getTargetConfigurations(targetNode: NxSimpleNode.Target): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        return nxWorkspace.projectGraph
            ?.nodes
            ?.get(targetNode.nxProjectName)
            ?.data
            ?.targets
            ?.get(targetNode.nxTargetName)
            ?.configurations
            ?.keys
            ?.map {
                NxSimpleNode.TargetConfiguration(
                    nxTargetConfigurationName = it,
                    nxTargetName = targetNode.nxTargetName,
                    nxProjectName = targetNode.nxProjectName,
                    parent = targetNode,
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
        return nxWorkspace.projectGraph
            ?.nodes
            ?.values
            ?.flatMap { p -> p.data.targets?.keys?.map { it to p.name } ?: emptyList() }
            ?.groupBy { it.first }
            ?.toSortedMap()
            ?.map { NxSimpleNode.TargetsList(it.key, targetsSectionNode) }
            ?.toTypedArray()
            ?: emptyArray()
    }

    protected fun getTargetsForTargetsList(
        targetsListNode: NxSimpleNode.TargetsList
    ): Array<NxSimpleNode> {
        if (nxWorkspace == null) {
            return emptyArray()
        }
        return nxWorkspace.projectGraph.nodes
            .filter { it.value.data.targets?.contains(targetsListNode.targetName) ?: false }
            .map {
                NxSimpleNode.Target(
                    displayName = it.key,
                    nxTargetName = targetsListNode.targetName,
                    nxProjectName = it.value.name,
                    parent = targetsListNode,
                )
            }
            .toTypedArray()
    }
}
