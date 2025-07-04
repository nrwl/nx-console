package dev.nx.console.nx_toolwindow.cloud_tree

import com.intellij.openapi.Disposable
import com.intellij.openapi.project.Project
import com.intellij.ui.tree.AsyncTreeModel
import com.intellij.ui.tree.StructureTreeModel
import com.intellij.ui.treeStructure.SimpleTreeStructure
import dev.nx.console.models.CIPEExecutionStatus
import dev.nx.console.models.CIPEInfo
import dev.nx.console.nx_toolwindow.cloud_tree.nodes.CIPESimpleNode
import javax.swing.tree.TreeModel

class CIPETreeStructure(private val project: Project) : SimpleTreeStructure(), Disposable {

    private val rootNode = CIPESimpleNode.CIPERootNode()
    private var cipeData: List<CIPEInfo> = emptyList()
    private var childrenCache: MutableMap<CIPESimpleNode, Array<CIPESimpleNode>> = mutableMapOf()

    init {
        // Start with empty data - will be populated by real API data
        updateCIPEData(emptyList())
    }

    override fun getRootElement(): Any = rootNode

    override fun getChildElements(element: Any): Array<Any> {
        if (element !is CIPESimpleNode) return emptyArray()

        // Check cache first
        childrenCache[element]?.let {
            return it as Array<Any>
        }

        val children =
            when (element) {
                is CIPESimpleNode.CIPERootNode -> {
                    buildChildrenForRoot(element, cipeData)
                }
                is CIPESimpleNode.CIPENode -> {
                    buildChildrenForCIPE(element)
                }
                is CIPESimpleNode.RunGroupNode -> {
                    buildChildrenForRunGroup(element)
                }
                is CIPESimpleNode.RunNode -> {
                    buildChildrenForRun(element)
                }
                is CIPESimpleNode.FailedTaskNode -> {
                    buildChildrenForFailedTask(element)
                }
                else -> emptyArray()
            }

        // Cache the result
        childrenCache[element] = children
        return children as Array<Any>
    }

    private fun buildChildrenForRoot(
        rootNode: CIPESimpleNode.CIPERootNode,
        cipeData: List<CIPEInfo>
    ): Array<CIPESimpleNode> {
        if (cipeData.isEmpty()) {
            return arrayOf(CIPESimpleNode.LabelNode("No recent CI pipeline executions", rootNode))
        }

        return cipeData
            .map { cipeInfo ->
                CIPESimpleNode.CIPENode(
                    cipeInfo = cipeInfo,
                    parent = rootNode
                )
            }
            .toTypedArray()
    }

    private fun buildChildrenForCIPE(cipeNode: CIPESimpleNode.CIPENode): Array<CIPESimpleNode> {
        return cipeNode.cipeInfo.runGroups
            .map { runGroup ->
                CIPESimpleNode.RunGroupNode(
                    runGroup = runGroup,
                    parent = cipeNode
                )
            }
            .toTypedArray()
    }

    private fun buildChildrenForRunGroup(
        runGroupNode: CIPESimpleNode.RunGroupNode
    ): Array<CIPESimpleNode> {
        return runGroupNode.runGroup.runs
            .map { run ->
                CIPESimpleNode.RunNode(
                    run = run,
                    parent = runGroupNode
                )
            }
            .toTypedArray()
    }

    private fun buildChildrenForRun(runNode: CIPESimpleNode.RunNode): Array<CIPESimpleNode> {
        val failedTasks = runNode.run.failedTasks ?: emptyList()
        return failedTasks
            .map { taskName ->
                CIPESimpleNode.FailedTaskNode(
                    taskName = taskName,
                    parent = runNode
                )
            }
            .toTypedArray()
    }

    private fun buildChildrenForFailedTask(
        taskNode: CIPESimpleNode.FailedTaskNode
    ): Array<CIPESimpleNode> {
        // Find the parent run group
        var current: CIPESimpleNode? = taskNode
        while (current != null && current !is CIPESimpleNode.RunGroupNode) {
            current = current.parent as? CIPESimpleNode
        }
        
        val runGroupNode = current as? CIPESimpleNode.RunGroupNode ?: return emptyArray()
        val aiFix = runGroupNode.runGroup.aiFix
        
        if (aiFix != null && taskNode.taskName in aiFix.taskIds) {
            return arrayOf(
                CIPESimpleNode.NxCloudFixNode(
                    aiFix = aiFix,
                    parent = taskNode
                )
            )
        }

        return emptyArray()
    }

    private fun findParentCIPE(node: CIPESimpleNode): CIPESimpleNode.CIPENode? {
        var current: CIPESimpleNode? = node
        while (current != null) {
            if (current is CIPESimpleNode.CIPENode) {
                return current
            }
            current = current.parent as? CIPESimpleNode
        }
        return null
    }

    override fun getParentElement(element: Any): Any? {
        return (element as? CIPESimpleNode)?.parent
    }

    override fun commit() {}

    override fun hasSomethingToCommit(): Boolean = false

    fun updateCIPEData(newData: List<CIPEInfo>) {
        cipeData = newData
        childrenCache.clear()
    }

    fun hasCIPEData(): Boolean {
        return cipeData.isNotEmpty()
    }

    fun createTreeModel(): TreeModel {
        val structureModel = StructureTreeModel(this, project)
        return AsyncTreeModel(structureModel, project)
    }

    fun shouldAutoExpand(element: Any): Boolean {
        if (element !is CIPESimpleNode) return false
        return when (element) {
            is CIPESimpleNode.CIPENode -> element.cipeInfo.status == CIPEExecutionStatus.FAILED
            is CIPESimpleNode.RunGroupNode -> true // Always expand run groups
            is CIPESimpleNode.RunNode -> (element.run.numFailedTasks ?: 0) > 0
            is CIPESimpleNode.FailedTaskNode -> true // Show fixes if available
            else -> false
        }
    }

    override fun dispose() {
        childrenCache.clear()
    }
}
