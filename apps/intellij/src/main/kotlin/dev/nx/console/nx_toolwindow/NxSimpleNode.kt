package dev.nx.console.nx_toolwindow

import com.intellij.icons.AllIcons
import com.intellij.ui.treeStructure.CachingSimpleNode
import com.intellij.ui.treeStructure.SimpleNode
import dev.nx.console.NxIcons
import dev.nx.console.models.NxProject
import dev.nx.console.models.NxWorkspace

sealed class NxSimpleNode(val nxProject: NxProject?, parent: SimpleNode?) :
    CachingSimpleNode(parent) {
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

    class Root(private val nxWorkspace: NxWorkspace?) : NxSimpleNode(null, null) {

        override val id = null
        init {
            icon = NxIcons.Action
        }

        override fun buildChildren(): Array<SimpleNode> {
            if (nxWorkspace == null) {
                return emptyArray()
            }
            val targets: Array<SimpleNode> = arrayOf(Targets(nxWorkspace, this))
            val projects: Array<SimpleNode> = arrayOf(Projects(nxWorkspace, this))

            return targets + projects
        }

        // TODO do not add a root node or get the name of workspace properly?
        override fun getName(): String =
            nxWorkspace?.workspacePath?.substringAfterLast("/") ?: "nx-workspace"
    }

    class Projects(private val nxWorkspace: NxWorkspace, parent: SimpleNode) :
        NxSimpleNode(null, parent) {
        override val id: String = "_projects"
        init {
            icon = AllIcons.Nodes.ModuleGroup
        }
        override fun buildChildren(): Array<SimpleNode> =
            nxWorkspace.workspace.projects.values.map { Project(it, this) }.toTypedArray()

        override fun getName(): String = "Projects"
    }

    class Targets(private val nxWorkspace: NxWorkspace, parent: SimpleNode) :
        NxSimpleNode(null, parent) {

        override val id: String = "_targets"
        init {
            icon = AllIcons.Nodes.ConfigFolder
        }

        override fun buildChildren(): Array<SimpleNode> =
            nxWorkspace.workspace.projects.values
                .flatMap { p -> p.targets.keys.map { it to p.name } }
                .groupBy { it.first }
                .map { TargetGroup(nxWorkspace, it.key, this) }
                .toTypedArray()

        override fun getName(): String = "Targets"
    }

    class TargetGroup(
        private val nxWorkspace: NxWorkspace,
        private val targetName: String,
        parent: SimpleNode
    ) : NxSimpleNode(null, parent) {
        override val id: String = "targetGroup_${targetName}"
        init {
            icon = AllIcons.Nodes.ConfigFolder
        }

        override fun buildChildren(): Array<SimpleNode> =
            nxWorkspace.workspace.projects
                .filter { it.value.targets.contains(targetName) }
                .map {
                    Target(
                        name = it.key,
                        nxProjectName = it.key,
                        nxTarget = targetName,
                        nxProject = it.value,
                        parent = this
                    )
                }
                .toTypedArray()

        override fun getName(): String = targetName
    }

    class Target(
        private val name: String,
        val nxProjectName: String,
        val nxTarget: String,
        nxProject: NxProject,
        parent: SimpleNode
    ) : NxSimpleNode(nxProject, parent) {
        override val id: String = "target_${nxProjectName}_$nxTarget"
        init {
            icon = AllIcons.General.Gear
            presentation.tooltip = "Target"
        }

        override fun buildChildren(): Array<SimpleNode> = emptyArray()

        override fun getName(): String = name
    }

    class Project(nxProject: NxProject, parent: SimpleNode) : NxSimpleNode(nxProject, parent) {
        override val id: String = "project_${nxProject.name}"

        init {
            icon = AllIcons.Nodes.Module
            presentation.tooltip = "Project"
        }

        override fun buildChildren(): Array<SimpleNode> =
            nxProject!!
                .targets
                .keys
                .map {
                    Target(
                        name = it,
                        nxProjectName = nxProject.name,
                        nxProject = nxProject,
                        nxTarget = it,
                        parent = this
                    )
                }
                .toTypedArray()

        override fun getName(): String = nxProject!!.name
    }
}
