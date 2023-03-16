package dev.nx.console.nx_toolwindow

import com.intellij.icons.AllIcons
import com.intellij.ui.treeStructure.CachingSimpleNode
import com.intellij.ui.treeStructure.SimpleNode
import dev.nx.console.NxIcons
import dev.nx.console.models.NxProject
import dev.nx.console.models.NxWorkspace

sealed class NxSimpleNode(parent: SimpleNode?) : CachingSimpleNode(parent) {
    class Root(private val nxWorkspace: NxWorkspace?) : NxSimpleNode(null) {

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
        NxSimpleNode(parent) {
        init {
            icon = AllIcons.Nodes.ModuleGroup
        }
        override fun buildChildren(): Array<SimpleNode> =
            nxWorkspace.workspace.projects.values.map { Project(it, this) }.toTypedArray()

        override fun getName(): String = "Projects"
    }

    class Targets(private val nxWorkspace: NxWorkspace, parent: SimpleNode) : NxSimpleNode(parent) {
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
    ) : NxSimpleNode(parent) {
        init {
            icon = AllIcons.Nodes.ConfigFolder
        }

        override fun buildChildren(): Array<SimpleNode> =
            nxWorkspace.workspace.projects
                .filter { it.value.targets.contains(targetName) }
                .map {
                    Target(name = it.key, nxProject = it.key, nxTarget = targetName, parent = this)
                }
                .toTypedArray()

        override fun getName(): String = targetName
    }

    class Target(
        private val name: String,
        val nxProject: String,
        val nxTarget: String,
        parent: SimpleNode
    ) : NxSimpleNode(parent) {
        init {
            icon = AllIcons.General.Gear
        }

        override fun buildChildren(): Array<SimpleNode> = emptyArray()

        override fun getName(): String = name
    }

    class Project(private val nxProject: NxProject, parent: SimpleNode) : NxSimpleNode(parent) {

        init {
            icon =
                if (nxProject.projectType == "application") AllIcons.Nodes.Module
                else AllIcons.Nodes.PpLib
        }

        override fun buildChildren(): Array<SimpleNode> =
            nxProject.targets.keys
                .map { Target(name = it, nxProject = nxProject.name, nxTarget = it, parent = this) }
                .toTypedArray()

        override fun getName(): String = nxProject.name
    }
}
