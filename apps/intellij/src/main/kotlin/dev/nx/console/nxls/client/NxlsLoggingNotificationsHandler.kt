package dev.nx.console.nxls.client

import com.intellij.platform.lsp.api.LspServerNotificationsHandler
import dev.nx.console.utils.NxConsoleLogger
import org.eclipse.lsp4j.MessageParams

class NxlsLoggingNotificationsHandler(private val delegate: LspServerNotificationsHandler) :
    LspServerNotificationsHandler by delegate {
    override fun logMessage(params: MessageParams) {
        params.message?.let { NxConsoleLogger.getInstance().log(it.removeSuffix("\n")) }
        delegate.logMessage(params)
    }
}
