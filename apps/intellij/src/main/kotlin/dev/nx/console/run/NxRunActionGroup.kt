package dev.nx.console.run

import com.intellij.openapi.actionSystem.*
import com.intellij.util.application
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

        return application.runReadAction<Array<AnAction>> {
            val nxProject =
                runBlocking { nxlsService.generatorContextFromPath(path = path)?.project }
                    ?: return@runReadAction emptyArray()

            val targets = runBlocking {
                nxlsService.workspace()?.workspace?.projects?.get(nxProject)?.targets?.keys
            }

            return@runReadAction targets?.map { NxRunAction(nxProject, it) }?.toTypedArray()
                ?: emptyArray()
        }
    }
}
