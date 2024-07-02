package dev.nx.console.nx_toolwindow.tree

import com.intellij.icons.ExpUiIcons
import com.intellij.ui.treeStructure.CachingSimpleNode
import dev.nx.console.NxIcons
import dev.nx.console.models.NxProject
import dev.nx.console.nx_toolwindow.tree.builder.NxTreeBuilderBase

sealed class NxSimpleNode(parent: NxSimpleNode?) : CachingSimpleNode(parent) {
    abstract val id: String?
    val idPath: List<String?> by lazy {
        when (parent) {
            is NxSimpleNode -> {
                parent.idPath + id
            }
            else -> {
                listOf(id)
            }
        }
    }

    private val rootNxTreeBuilder: NxTreeBuilderBase? by lazy {
        if (this is Root) {
            nxTreeBuilder
        } else {
            parent?.rootNxTreeBuilder
        }
    }

    val nxProject: NxProject? by lazy { rootNxTreeBuilder?.getNxProjectForNode(this) }

    override fun buildChildren(): Array<NxSimpleNode> =
        rootNxTreeBuilder?.buildChildren(this) ?: emptyArray()

    class Root(private val workspaceName: String, val nxTreeBuilder: NxTreeBuilderBase) :
        NxSimpleNode(null) {

        override val id = null

        init {
            icon = NxIcons.Action
        }

        override fun getName(): String = workspaceName
    }

    class ProjectsSection(parent: NxSimpleNode) : NxSimpleNode(parent) {
        override val id: String = "_projects"

        init {
            icon = ExpUiIcons.Nodes.ModuleGroup
        }

        override fun getName(): String = "Projects"
    }

    class TargetsSection(parent: NxSimpleNode) : NxSimpleNode(parent) {
        override val id: String = "_targets"

        init {
            icon = ExpUiIcons.Build.TaskGroup
        }

        override fun getName(): String = "Targets"
    }

    class TargetsList(val targetName: String, parent: NxSimpleNode) : NxSimpleNode(parent) {
        override val id: String = "targetsList_${targetName}"

        init {
            icon = ExpUiIcons.Build.TaskGroup
        }

        override fun getName(): String = targetName
    }

    class TargetGroup(
        val targetGroupName: String,
        val nxProjectName: String,
        val targets: Array<String>,
        parent: NxSimpleNode
    ) : NxSimpleNode(parent) {
        override val id: String = "targetGroup_${targetGroupName}"

        init {
            icon = ExpUiIcons.Toolwindow.Dependencies
        }

        override fun getName(): String = targetGroupName
    }

    class Target(
        private val displayName: String,
        val nxTargetName: String,
        val nxProjectName: String,
        parent: NxSimpleNode
    ) : NxSimpleNode(parent) {
        override val id: String = "target_${nxProjectName}_$nxTargetName"

        init {
            icon = ExpUiIcons.Build.Task
            presentation.tooltip = "Target"
        }

        override fun getName(): String = displayName
    }

    class Project(val nxProjectName: String, parent: NxSimpleNode) : NxSimpleNode(parent) {
        override val id: String = "project_${nxProjectName}"

        init {
            icon = ExpUiIcons.Nodes.Module
            presentation.tooltip = "Project"
        }

        override fun getName(): String = nxProjectName
    }

    class TargetConfiguration(
        val nxTargetConfigurationName: String,
        val nxTargetName: String,
        val nxProjectName: String,
        parent: NxSimpleNode
    ) : NxSimpleNode(parent) {
        override val id: String =
            "config_${nxProjectName}_${nxTargetName}_$nxTargetConfigurationName"

        init {
            icon = ExpUiIcons.Build.Task
            presentation.tooltip = "Target Configuration"
        }

        override fun getName(): String = nxTargetConfigurationName
    }

    class Folder(val path: String, parent: NxSimpleNode) : NxSimpleNode(parent) {
        override val id: String = "folder_${path}"

        init {
            icon = ExpUiIcons.Nodes.Folder
        }

        override fun getName(): String {
            val lastSlashIndex = path.lastIndexOf("/")
            return if (lastSlashIndex >= 0 && lastSlashIndex < path.length - 1) {
                path.substring(lastSlashIndex + 1)
            } else {
                path
            }
        }
    }
}
