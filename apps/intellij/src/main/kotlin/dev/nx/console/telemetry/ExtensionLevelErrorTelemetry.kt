package dev.nx.console.telemetry

import com.intellij.diagnostic.MessagePool
import com.intellij.diagnostic.MessagePoolListener
import com.intellij.ide.plugins.PluginUtil
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import dev.nx.console.utils.NxConsolePluginDisposable

@Service(Service.Level.PROJECT)
class ExtensionLevelErrorTelemetry(val project: Project) : Disposable {
    private val messagePool = MessagePool.getInstance()
    private val listener: MessagePoolListener = MessagePoolListener { logException() }

    fun listen() {
        messagePool.addListener(listener)
        Disposer.register(NxConsolePluginDisposable.getInstance(project), this)
    }

    private fun logException() {
        val newError = messagePool.getFatalErrors(true, true).last()

        val pluginId: PluginId? = PluginUtil.getInstance().findPluginId(newError.throwable)

        if (newError != null && pluginId != null && pluginId.idString == "dev.nx.console") {
            TelemetryService.getInstance(project)
                .featureUsed(
                    TelemetryEvent.MISC_EXCEPTION,
                    mapOf("name" to newError.throwable.javaClass.name)
                )
        }
    }

    override fun dispose() {
        messagePool.removeListener(listener)
    }

    companion object {
        fun getInstance(project: Project): ExtensionLevelErrorTelemetry =
            project.getService(ExtensionLevelErrorTelemetry::class.java)
    }
}
