package dev.nx.console.run

import com.intellij.openapi.actionSystem.*
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.runBlocking

class NxRunActionGroup : ActionGroup() {

    init {
        templatePresentation.isHideGroupIfEmpty = true
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun getChildren(e: AnActionEvent?): Array<AnAction> {
        val project = e?.project ?: return emptyArray()
        val path = e?.dataContext?.getData(CommonDataKeys.VIRTUAL_FILE)?.path ?: return emptyArray()

        val nxlsService = NxlsService.getInstance(project)

        val nxProject =
            runBlocking { nxlsService.generatorContextFromPath(path = path)?.project }
                ?: return emptyArray()

        val targets = runBlocking {
            nxlsService.workspace()?.workspace?.projects?.get(nxProject)?.targets?.keys
        }

        return targets?.map { NxRunAction(nxProject, it) }?.toTypedArray() ?: emptyArray()
    }
}
