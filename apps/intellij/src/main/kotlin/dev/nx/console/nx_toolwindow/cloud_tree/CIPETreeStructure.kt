package dev.nx.console.nx_toolwindow.cloud_tree

import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.ui.PopupHandler
import com.intellij.ui.tree.AsyncTreeModel
import com.intellij.ui.tree.StructureTreeModel
import com.intellij.ui.treeStructure.SimpleTreeStructure
import com.intellij.util.ui.tree.TreeUtil
import dev.nx.console.models.CIPEInfo
import dev.nx.console.nx_toolwindow.cloud_tree.actions.OpenCIPECommitAction
import dev.nx.console.nx_toolwindow.cloud_tree.actions.OpenCIPEInNxCloudAction
import dev.nx.console.nx_toolwindow.cloud_tree.actions.OpenRunInNxCloudAction
import dev.nx.console.utils.NxConsolePluginDisposable
import javax.swing.tree.TreeModel

class CIPETreeStructure(val tree: CIPETree, private val project: Project) : SimpleTreeStructure() {

    companion object {
        private val logger = thisLogger()
    }

    private val rootNode = CIPESimpleNode.CIPERootNode()
    private var cipeData: List<CIPEInfo> = emptyList()
    private var treeModel = StructureTreeModel(this, NxConsolePluginDisposable.getInstance(project))
    val persistenceManager = CIPETreePersistenceManager(tree)

    init {
        tree.model = AsyncTreeModel(treeModel, NxConsolePluginDisposable.getInstance(project))
        updateCIPEData(emptyList())

        installPopupActions()
        persistenceManager.installPersistenceListeners()
    }

    private fun installPopupActions() {
        val actionList =
            listOf(OpenCIPEInNxCloudAction(), OpenCIPECommitAction(), OpenRunInNxCloudAction())

        val actionGroup = DefaultActionGroup(actionList)
        PopupHandler.installPopupMenu(tree, actionGroup, "CIPEToolWindow")
    }

    override fun getRootElement(): Any = rootNode

    override fun getChildElements(element: Any): Array<Any> {
        if (element !is CIPESimpleNode) return emptyArray()

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
                else -> emptyArray()
            }

        return children as Array<Any>
    }

    private fun buildChildrenForRoot(
        rootNode: CIPESimpleNode.CIPERootNode,
        cipeData: List<CIPEInfo>
    ): Array<CIPESimpleNode> {
        if (cipeData.isEmpty()) {
            return arrayOf(CIPESimpleNode.LabelNode("No recent PRs from your branches", rootNode))
        }

        return cipeData
            .map { cipeInfo -> CIPESimpleNode.CIPENode(cipeInfo = cipeInfo, parent = rootNode) }
            .toTypedArray()
    }

    private fun buildChildrenForCIPE(cipeNode: CIPESimpleNode.CIPENode): Array<CIPESimpleNode> {
        val runGroups = cipeNode.cipeInfo.runGroups

        // If there's only one run group, skip creating the RunGroupNode and return runs directly
        if (runGroups.size == 1) {
            val singleRunGroup = runGroups.first()
            val children = mutableListOf<CIPESimpleNode>()

            // Add AI fix first if it exists for single run group (no need to show run group ID
            // since there's only one)
            val aiFix = singleRunGroup.aiFix
            if (aiFix != null) {
                logger.debug(
                    "[CIPE_TREE] Adding AI fix node for single run group. " +
                        "aiFixId=${aiFix.aiFixId}, taskIds=${aiFix.taskIds}, " +
                        "suggestedFixStatus=${aiFix.suggestedFixStatus}, " +
                        "verificationStatus=${aiFix.verificationStatus}, " +
                        "hasSuggestedFix=${aiFix.suggestedFix != null}"
                )
                children.add(
                    CIPESimpleNode.NxCloudFixNode(
                        aiFix = aiFix,
                        parent = cipeNode,
                    )
                )
            } else {
                logger.debug(
                    "[CIPE_TREE] No AI fix for single run group ${singleRunGroup.runGroup}"
                )
            }

            // Add runs after AI fix
            children.addAll(
                singleRunGroup.runs.map { run ->
                    CIPESimpleNode.RunNode(run = run, runGroup = singleRunGroup, parent = cipeNode)
                }
            )

            return children.toTypedArray()
        }

        // Multiple run groups - show them in the hierarchy
        return runGroups
            .map { runGroup -> CIPESimpleNode.RunGroupNode(runGroup = runGroup, parent = cipeNode) }
            .toTypedArray()
    }

    private fun buildChildrenForRunGroup(
        runGroupNode: CIPESimpleNode.RunGroupNode
    ): Array<CIPESimpleNode> {
        val children = mutableListOf<CIPESimpleNode>()

        // Add AI fix first if it exists
        val aiFix = runGroupNode.runGroup.aiFix
        if (aiFix != null) {
            logger.debug(
                "[CIPE_TREE] Adding AI fix node for run group ${runGroupNode.runGroup.runGroup}. " +
                    "aiFixId=${aiFix.aiFixId}, taskIds=${aiFix.taskIds}, " +
                    "suggestedFixStatus=${aiFix.suggestedFixStatus}, " +
                    "verificationStatus=${aiFix.verificationStatus}, " +
                    "hasSuggestedFix=${aiFix.suggestedFix != null}"
            )
            children.add(
                CIPESimpleNode.NxCloudFixNode(
                    aiFix = aiFix,
                    parent = runGroupNode,
                )
            )
        } else {
            logger.debug("[CIPE_TREE] No AI fix for run group ${runGroupNode.runGroup.runGroup}")
        }

        // Add runs after AI fix
        children.addAll(
            runGroupNode.runGroup.runs.map { run ->
                CIPESimpleNode.RunNode(
                    run = run,
                    runGroup = runGroupNode.runGroup,
                    parent = runGroupNode
                )
            }
        )

        return children.toTypedArray()
    }

    private fun buildChildrenForRun(runNode: CIPESimpleNode.RunNode): Array<CIPESimpleNode> {
        val failedTasks = runNode.run.failedTasks ?: emptyList()

        return failedTasks
            .map { taskName ->
                CIPESimpleNode.FailedTaskNode(taskName = taskName, parent = runNode)
            }
            .toTypedArray()
    }

    override fun getParentElement(element: Any): Any? {
        return (element as? CIPESimpleNode)?.parent
    }

    override fun commit() {}

    override fun hasSomethingToCommit(): Boolean = false

    fun updateCIPEData(newData: List<CIPEInfo>) {
        logger.debug("[CIPE_TREE] Updating CIPE data with ${newData.size} CIPEs")

        // Log AI fix information for debugging
        newData.forEach { cipe ->
            cipe.runGroups.forEach { runGroup ->
                val aiFix = runGroup.aiFix
                if (aiFix != null) {
                    logger.debug(
                        "[CIPE_TREE] Found AI fix in data: " +
                            "cipeId=${cipe.ciPipelineExecutionId}, runGroup=${runGroup.runGroup}, " +
                            "aiFixId=${aiFix.aiFixId}, taskIds=${aiFix.taskIds}, " +
                            "suggestedFixStatus=${aiFix.suggestedFixStatus}, " +
                            "verificationStatus=${aiFix.verificationStatus}"
                    )
                }
            }
        }

        val addedAIFixes = extractAIFixes(newData) - extractAIFixes(cipeData)
        logger.debug("[CIPE_TREE] Added AI fixes: $addedAIFixes")

        cipeData = newData

        treeModel.invalidateAsync().thenRun {
            persistenceManager.let { pm ->
                tree.let { treeComponent ->
                    val persistenceVisitor = pm.CIPETreePersistenceVisitor()

                    TreeUtil.promiseExpand(treeComponent, listOf(persistenceVisitor).stream())
                }
            }
        }
    }

    private fun extractAIFixes(data: List<CIPEInfo>): Set<String> {
        val fixes = mutableSetOf<String>()
        for (cipe in data) {
            for (runGroup in cipe.runGroups) {
                val aiFix = runGroup.aiFix
                if (aiFix != null) {
                    fixes.add(aiFix.aiFixId)
                }
            }
        }
        return fixes
    }

    fun createTreeModel(): TreeModel {
        val structureModel = StructureTreeModel(this, project)
        this.treeModel = structureModel
        return AsyncTreeModel(structureModel, project)
    }
}

inline fun <reified T : CIPESimpleNode> findAncestor(node: CIPESimpleNode): T? {
    var current: CIPESimpleNode? = node
    while (current != null) {
        if (current is T) return current
        current = current.parent
    }

    return null
}
