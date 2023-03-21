package dev.nx.console.graph

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import dev.nx.console.nx_toolwindow.NxSimpleNode
import dev.nx.console.nx_toolwindow.NxTreeNodeKey
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.runBlocking

class NxGraphFocusProjectAction : AnAction("Nx Graph: Focus project") {
    override fun update(e: AnActionEvent) {
        val nxTreeNode = e.getData(NxTreeNodeKey) ?: return
        if (nxTreeNode !is NxSimpleNode.Project) {
            e.presentation.isEnabledAndVisible = false
        }
    }
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val nxProjectName =
            e.getData(NxTreeNodeKey)
                .let { if (it is NxSimpleNode.Project) it.nxProject else null }
                .let {
                    if (it != null) {
                        it.name
                    } else {
                        val path =
                            e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path ?: return
                        runBlocking {
                                NxlsService.getInstance(project)
                                    .generatorContextFromPath(path = path)
                            }
                            ?.projectName
                    }
                }
                ?: return

        val graphService = NxGraphService.getInstance(project)
        graphService.showProjectGraphInEditor()
        graphService.focusProject(nxProjectName)
    }
}
