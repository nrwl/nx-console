package dev.nx.console.nx_toolwindow.cloud_tree

import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.ui.tree.AsyncTreeModel
import com.intellij.ui.tree.StructureTreeModel
import com.intellij.ui.treeStructure.SimpleTreeStructure
import com.intellij.ui.treeStructure.Tree
import com.intellij.util.ui.tree.TreeUtil
import dev.nx.console.models.CIPEInfo
import javax.swing.tree.TreeModel
import javax.swing.tree.TreePath

class CIPETreeStructure(private val project: Project) : SimpleTreeStructure() {

    private val logger = thisLogger()
    private val rootNode = CIPESimpleNode.CIPERootNode()
    private var cipeData: List<CIPEInfo> = emptyList()
    private var treeModel: StructureTreeModel<*>? = null
    var persistenceManager: CIPETreePersistenceManager? = null
    var tree: Tree? = null

    init {
        updateCIPEData(emptyList())
    }

    override fun getRootElement(): Any = rootNode

    override fun getChildElements(element: Any): Array<Any> {
        if (element !is CIPESimpleNode) return emptyArray()

        val elementType = element::class.simpleName
        logger.debug("[CIPE_TREE] Getting children for element type: $elementType")

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

        logger.debug("[CIPE_TREE] Returning ${children.size} children for $elementType")
        return children as Array<Any>
    }

    private fun buildChildrenForRoot(
        rootNode: CIPESimpleNode.CIPERootNode,
        cipeData: List<CIPEInfo>
    ): Array<CIPESimpleNode> {
        logger.debug("[CIPE_TREE] Building root children with ${cipeData.size} CIPEs")

        if (cipeData.isEmpty()) {
            logger.debug("[CIPE_TREE] No CIPE data, showing empty message")
            return arrayOf(CIPESimpleNode.LabelNode("No recent CI pipeline executions", rootNode))
        }

        return cipeData
            .map { cipeInfo ->
                logger.debug(
                    "[CIPE_TREE] Creating node for CIPE ${cipeInfo.ciPipelineExecutionId}: " +
                        "status=${cipeInfo.status}, branch=${cipeInfo.branch ?: "unknown"}"
                )
                CIPESimpleNode.CIPENode(cipeInfo = cipeInfo, parent = rootNode)
            }
            .toTypedArray()
    }

    private fun buildChildrenForCIPE(cipeNode: CIPESimpleNode.CIPENode): Array<CIPESimpleNode> {
        return cipeNode.cipeInfo.runGroups
            .map { runGroup -> CIPESimpleNode.RunGroupNode(runGroup = runGroup, parent = cipeNode) }
            .toTypedArray()
    }

    private fun buildChildrenForRunGroup(
        runGroupNode: CIPESimpleNode.RunGroupNode
    ): Array<CIPESimpleNode> {
        return runGroupNode.runGroup.runs
            .map { run -> CIPESimpleNode.RunNode(run = run, parent = runGroupNode) }
            .toTypedArray()
    }

    private fun buildChildrenForRun(runNode: CIPESimpleNode.RunNode): Array<CIPESimpleNode> {
        val failedTasks = runNode.run.failedTasks ?: emptyList()
        logger.debug(
            "[CIPE_TREE] Building children for run ${runNode.run.linkId}: " +
                "failedTasks=${failedTasks.size}"
        )

        return failedTasks
            .map { taskName ->
                logger.debug("[CIPE_TREE] Creating failed task node for: $taskName")
                CIPESimpleNode.FailedTaskNode(taskName = taskName, parent = runNode)
            }
            .toTypedArray()
    }

    private fun buildChildrenForFailedTask(
        taskNode: CIPESimpleNode.FailedTaskNode
    ): Array<CIPESimpleNode> {
        logger.debug("[CIPE_TREE] Building children for failed task: ${taskNode.taskName}")

        // Find the parent run group
        var current: CIPESimpleNode? = taskNode
        while (current != null && current !is CIPESimpleNode.RunGroupNode) {
            current = current.parent as? CIPESimpleNode
        }

        val runGroupNode =
            current as? CIPESimpleNode.RunGroupNode
                ?: run {
                    logger.warn(
                        "[CIPE_TREE] Could not find parent run group for task ${taskNode.taskName}"
                    )
                    return emptyArray()
                }

        val aiFix = runGroupNode.runGroup.aiFix
        logger.debug("[CIPE_TREE] Run group has AI fix: ${aiFix != null}")

        if (aiFix != null && taskNode.taskName in aiFix.taskIds) {
            logger.info("[CIPE_TREE] AI fix found for task ${taskNode.taskName}")
            return arrayOf(CIPESimpleNode.NxCloudFixNode(aiFix = aiFix, parent = taskNode))
        }

        logger.debug("[CIPE_TREE] No AI fix available for task ${taskNode.taskName}")
        return emptyArray()
    }

    override fun getParentElement(element: Any): Any? {
        return (element as? CIPESimpleNode)?.parent
    }

    override fun commit() {}

    override fun hasSomethingToCommit(): Boolean = false

    fun updateCIPEData(newData: List<CIPEInfo>) {
        // Extract AI fixes from old data
        val oldAIFixes = extractAIFixes(cipeData)

        // Extract AI fixes from new data
        val newAIFixes = extractAIFixes(newData)

        val addedAIFixes = newAIFixes - oldAIFixes

        cipeData = newData
        treeModel?.invalidateAsync()?.thenRun {
            persistenceManager?.let { pm ->
                tree?.let { treeComponent ->
                    val visitor = pm.CIPETreePersistenceVisitor()
                    TreeUtil.promiseExpand(treeComponent, visitor).onProcessed {
                        // After restoring previous state, expand to new AI fixes
                        if (addedAIFixes.isNotEmpty()) {
                            expandToAIFixes(addedAIFixes.toList())
                        }
                    }
                }
            }
        }
    }

    private fun extractAIFixes(data: List<CIPEInfo>): Set<Pair<String, String>> {
        val fixes = mutableSetOf<Pair<String, String>>()
        for (cipe in data) {
            for (runGroup in cipe.runGroups) {
                val aiFix = runGroup.aiFix
                if (aiFix != null && aiFix.taskIds.isNotEmpty()) {
                    fixes.add(cipe.ciPipelineExecutionId to runGroup.runGroup)
                }
            }
        }
        return fixes
    }

    private fun expandToAIFixes(aiFixes: List<Pair<String, String>>) {
        val treeComponent = tree ?: return

        for ((cipeId, runGroupId) in aiFixes) {
            // Find the path to the AI fix node
            val pathToExpand = findPathToAIFix(cipeId, runGroupId)
            pathToExpand?.let { path -> treeComponent.expandPath(path) }
        }
    }

    private fun findPathToAIFix(cipeId: String, runGroupId: String): TreePath? {
        val treeComponent = tree ?: return null
        val model = treeComponent.model
        val root = model.root ?: return null

        // Navigate through the tree structure
        // Root -> CIPE -> RunGroup -> Run -> FailedTask -> AIFix

        // Find CIPE node
        for (i in 0 until model.getChildCount(root)) {
            val cipeNode = model.getChild(root, i)
            val cipeObject = TreeUtil.getUserObject(cipeNode)
            if (
                cipeObject is CIPESimpleNode.CIPENode &&
                    cipeObject.cipeInfo.ciPipelineExecutionId == cipeId
            ) {
                // Find RunGroup node
                for (j in 0 until model.getChildCount(cipeNode)) {
                    val runGroupNode = model.getChild(cipeNode, j)
                    val runGroupObject = TreeUtil.getUserObject(runGroupNode)
                    if (
                        runGroupObject is CIPESimpleNode.RunGroupNode &&
                            runGroupObject.runGroup.runGroup == runGroupId
                    ) {
                        // Find the first failed run with AI fix
                        for (k in 0 until model.getChildCount(runGroupNode)) {
                            val runNode = model.getChild(runGroupNode, k)
                            val runObject = TreeUtil.getUserObject(runNode)
                            if (
                                runObject is CIPESimpleNode.RunNode &&
                                    (runObject.run.numFailedTasks ?: 0) > 0
                            ) {
                                // Find failed task with AI fix
                                for (l in 0 until model.getChildCount(runNode)) {
                                    val taskNode = model.getChild(runNode, l)
                                    val taskObject = TreeUtil.getUserObject(taskNode)
                                    if (taskObject is CIPESimpleNode.FailedTaskNode) {
                                        // Check if this task has an AI fix
                                        for (m in 0 until model.getChildCount(taskNode)) {
                                            val fixNode = model.getChild(taskNode, m)
                                            val fixObject = TreeUtil.getUserObject(fixNode)
                                            if (fixObject is CIPESimpleNode.NxCloudFixNode) {
                                                // Build the path
                                                return TreePath(
                                                    arrayOf(
                                                        root,
                                                        cipeNode,
                                                        runGroupNode,
                                                        runNode,
                                                        taskNode,
                                                        fixNode
                                                    )
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return null
    }

    fun createTreeModel(): TreeModel {
        val structureModel = StructureTreeModel(this, project)
        this.treeModel = structureModel
        return AsyncTreeModel(structureModel, project)
    }
}
