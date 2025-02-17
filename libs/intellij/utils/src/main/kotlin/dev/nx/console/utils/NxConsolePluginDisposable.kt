package dev.nx.console.utils

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project

@Service(Service.Level.PROJECT)
class NxConsolePluginDisposable : Disposable {
    override fun dispose() {}

    companion object {
        fun getInstance(project: Project): NxConsolePluginDisposable =
            project.getService(NxConsolePluginDisposable::class.java)
    }
}
