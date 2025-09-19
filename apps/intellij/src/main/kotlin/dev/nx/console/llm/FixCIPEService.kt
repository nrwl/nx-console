package dev.nx.console.llm

import com.intellij.ml.llm.core.chat.session.*
import com.intellij.ml.llm.privacy.trustedStringBuilders.privacyConst
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.EDT
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class CIPEAutoFixAction() : AnAction() {
    override fun actionPerformed(event: AnActionEvent) {
        val project = event.project ?: return
        TelemetryService.getInstance(project)
            .featureUsed(
                TelemetryEvent.CLOUD_FIX_CIPE_ERROR,
                mapOf("source" to TelemetryEventSource.NOTIFICATION),
            )

        FixCIPEService.getInstance(project).fixInAIAssistant()
    }
}

class FixCIPEService(private val project: Project, private val cs: CoroutineScope) {
    val logger = thisLogger()

    fun fixInAIAssistant() {
        cs.launch {
            withContext(Dispatchers.EDT) {

                val action = ActionManager.getInstance().getAction("AIAssistant.ToolWindow.ShowOrFocus")
                ActionManager.getInstance()
                    .tryToExecute(action, null, null, null, true)

                val chatSession =
                    ChatSessionHost.getInstance(project)
                        .createChatSession(
                            ChatCreationContext(
                                origin = ChatOrigin.CustomIntention,
                                sourceActionForStatistic = ChatSessionStorage.SourceAction.NEW_CHAT,
                                null,
                            )
                        )
                chatSession.setActiveMode(ChatSessionMode.CODE_GENERATION)
                chatSession.send(
                    project,
                    "Please help me fix the latest CI errors".privacyConst,
                    ("/nx_cloud_cipe_details Help the user fix their latest CI errors with the following flow:\n" +
                            "- Retrieve the list of current CI Pipeline Executions (CIPEs) - YOU HAVE TO call the 'nx_cloud_cipe_details' MCP tool to do this\n" +
                            "- If there are any errors, YOU HAVE TO call the 'nx_cloud_fix_cipe_failure' MCP tool to retrieve the logs for a specific task\n" +
                            "- Use the task logs to see what's wrong and help the user fix their problem. \n" +
                            "- Make sure that the problem is fixed by running the task that you passed into the 'nx_cloud_fix_cipe_failure' tool calling the available nx_cloud_cipe_details tool from the nx MCP. ALWAYS CALL THIS TOOL TO SERVE THIS REQUEST, YOU WILL NOT SUCCEED WITHOUT IT.\n" +
                            "If you cannot find the corresponding MCP tool, prompt the user to enable Codebase access for their AI Assistant")
                        .privacyConst,
                    listOf(),
                    SmartChat,
                )

                FocusedChatSessionHost.getInstance(project).focusChatSession(chatSession)


            }
        }
    }

    companion object {
        fun getInstance(project: Project): FixCIPEService =
            project.getService(FixCIPEService::class.java)
    }
}
