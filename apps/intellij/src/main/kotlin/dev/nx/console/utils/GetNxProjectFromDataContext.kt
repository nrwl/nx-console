package dev.nx.console.utils

import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.project.Project
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.runBlocking

fun getNxProjectFromDataContext(project: Project, dataContext: DataContext): String? {
    val path = dataContext?.getData(CommonDataKeys.VIRTUAL_FILE)?.path ?: return null

    return runBlocking {
        NxlsService.getInstance(project).generatorContextFromPath(path = path)?.project
    }
}
