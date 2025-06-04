package dev.nx.console.cloud

import com.intellij.codeInsight.intention.IntentionAction
import com.intellij.ide.BrowserUtil
import com.intellij.ml.llm.core.chat.session.*
import com.intellij.ml.llm.core.chat.ui.AIAssistantUIUtil
import com.intellij.ml.llm.intentions.chat.AbstractChatIntention
import com.intellij.ml.llm.intentions.editor.AIIntentionsActionGroup
import com.intellij.ml.llm.privacy.trustedStringBuilders.privacyConst
import com.intellij.notification.*
import com.intellij.openapi.actionSystem.ActionWithDelegate
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiFile
import com.intellij.util.IncorrectOperationException
import dev.nx.console.models.CIPEExecutionStatus
import dev.nx.console.models.CIPEInfo
import dev.nx.console.models.CIPERun
import dev.nx.console.models.CIPERunGroup
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.settings.options.NxCloudNotificationsLevel
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Service responsible for showing CIPE notifications. Simply displays notification events emitted
 * by CIPEDataSyncService.
 */
@Service(Service.Level.PROJECT)
class CIPENotificationService(private val project: Project) : CIPENotificationListener {

    companion object {
        private const val NOTIFICATION_GROUP_ID = "Nx Cloud CIPE"
        private val NOTIFICATION_GROUP =
            NotificationGroupManager.getInstance().getNotificationGroup(NOTIFICATION_GROUP_ID)

        fun getInstance(project: Project): CIPENotificationService =
            project.getService(CIPENotificationService::class.java)
    }

    private val logger = thisLogger()
    private val telemetryService = TelemetryService.getInstance(project)

    fun demoFailedNotification() {
        // This is a demo method to show how a failed notification would look like
        val cipe =
            CIPEInfo(
                cipeUrl = "https://example.com/cipe/123",
                commitUrl = "https://example.com/commit/456",
                branch = "main",
                ciPipelineExecutionId = "cipe-123",
                status = CIPEExecutionStatus.FAILED,
                createdAt = 1112321L,
                completedAt = 33213231L,
                commitTitle = "Fix critical bug",
                author = "John Doe",
                authorAvatarUrl = "https://example.com/avatar/johndoe.png",
                runGroups = emptyList<CIPERunGroup>()
            )
        showCIPEFailedNotification(cipe)
    }

    override fun onNotificationEvent(event: CIPENotificationEvent) {
        val notificationSetting = getCIPENotificationSetting()

        // Check settings before showing any notification
        if (notificationSetting == NxCloudNotificationsLevel.NONE) {
            return
        }

        // For success notifications, only show if settings allow
        if (
            event is CIPENotificationEvent.CIPESucceeded &&
                notificationSetting != NxCloudNotificationsLevel.ALL
        ) {
            return
        }

        // Show the appropriate notification
        when (event) {
            is CIPENotificationEvent.CIPEFailed -> showCIPEFailedNotification(event.cipe)
            is CIPENotificationEvent.RunFailed -> showRunFailedNotification(event.cipe, event.run)
            is CIPENotificationEvent.CIPESucceeded -> showCIPESucceededNotification(event.cipe)
        }
    }

    private fun showCIPEFailedNotification(cipe: CIPEInfo) {
        showNotification(
            title = "CI Pipeline Failed",
            content = "CI Pipeline Execution for #${cipe.branch} has completed",
            type = NotificationType.ERROR,
            cipeUrl = cipe.cipeUrl,
            commitUrl = cipe.commitUrl,
        )
    }

    private fun showRunFailedNotification(cipe: CIPEInfo, run: CIPERun) {
        val command =
            if (run.command.length > 70) {
                run.command.substring(0, 60) + "[...]"
            } else {
                run.command
            }

        showNotification(
            title = "Run Failed",
            content = "\"$command\" has failed on #${cipe.branch}",
            type = NotificationType.ERROR,
            cipeUrl = run.runUrl,
            commitUrl = cipe.commitUrl,
        )
    }

    private fun showCIPESucceededNotification(cipe: CIPEInfo) {
        showNotification(
            title = "CI Pipeline Succeeded",
            content = "CI Pipeline Execution for #${cipe.branch} has completed",
            type = NotificationType.INFORMATION,
            cipeUrl = cipe.cipeUrl,
            commitUrl = cipe.commitUrl,
        )
    }

    private fun showNotification(
        title: String,
        content: String,
        type: NotificationType,
        cipeUrl: String,
        commitUrl: String?,
    ) {
        telemetryService.featureUsed(TelemetryEvent.CLOUD_SHOW_CIPE_NOTIFICATION)

        val notification =
            NOTIFICATION_GROUP.createNotification(title = title, content = content, type = type)

        // Add actions in order: Help (if error), View Commit (if available), View Results
        if (type == NotificationType.ERROR) {
            notification.addAction(CIPEAutoFixAction(project))
        }

        if (commitUrl != null) {
            notification.addAction(ViewCommitAction(commitUrl))
        }

        notification.addAction(ViewResultsAction(cipeUrl))

        notification.notify(project)
    }

    private fun getCIPENotificationSetting(): NxCloudNotificationsLevel {
        return NxConsoleSettingsProvider.getInstance().nxCloudNotifications
    }

    // Notification Actions

    private inner class ViewResultsAction(private val url: String) :
        NotificationAction("View Results") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            telemetryService.featureUsed(
                TelemetryEvent.CLOUD_VIEW_CIPE,
                mapOf("source" to TelemetryEventSource.NOTIFICATION),
            )
            BrowserUtil.browse(url)
            notification.expire()
        }
    }

    private inner class ViewCommitAction(private val url: String) :
        NotificationAction("View Commit") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            telemetryService.featureUsed(
                TelemetryEvent.CLOUD_VIEW_CIPE_COMMIT,
                mapOf("source" to TelemetryEventSource.NOTIFICATION),
            )
            BrowserUtil.browse(url)
            notification.expire()
        }
    }

    private inner class CIPEAutoFixAction(private val project: Project) :
        AnAction("Help me fix this") {
        override fun actionPerformed(event: AnActionEvent) {
            TelemetryService.getInstance(project)
                .featureUsed(
                    TelemetryEvent.CLOUD_FIX_CIPE_ERROR,
                    mapOf("source" to TelemetryEventSource.NOTIFICATION),
                )

            FixCIPEService.getInstance(project).fixInAIAssistant()
        }
    }
}

@Service(Service.Level.PROJECT)
class FixCIPEService(private val project: Project, private val cs: CoroutineScope) {

    fun fixInAIAssistant() {
        cs.launch {
            withContext(Dispatchers.EDT) {
                val chatSession =
                    ChatSessionHost.getInstance(project)
                        .createChatSession(
                            ChatCreationContext(
                                origin = ChatOrigin.CustomIntention,
                                sourceActionForStatistic = ChatSessionStorage.SourceAction.NEW_CHAT,
                                null,
                            )
                        )


                AIAssistantUIUtil.openChat(project, chatSession)


                val string =
                    "/nx_cloud_cipe_details please help me fix the latest CI errors".privacyConst
                chatSession.send(project, string, SmartChat)

            }
        }
    }

    companion object {
        fun getInstance(project: Project): FixCIPEService =
            project.getService(FixCIPEService::class.java)
    }
}

class FixCIPEInAIAssistant : AIIntentionsActionGroup() {
    override fun getChildren(e: AnActionEvent?): Array<AnAction> {
        return arrayOf(FixIntentionAction(FixCIPEInAIAssistantIntention()))
    }
}

class FixCIPEInAIAssistantIntention : AbstractChatIntention() {
    override fun getFamilyName(): String {
        return "Nx AI"
    }

    override fun getText(): String {
        return "Fix in AI Assistant"
    }
}

class FixIntentionAction(private val intention: FixCIPEInAIAssistantIntention) :
    IntentionAction, AnAction(intention.text), ActionWithDelegate<FixCIPEInAIAssistantIntention> {
    override fun startInWriteAction(): Boolean = true

    override fun getFamilyName(): String = "Fix CIPE in AI Assistant"

    override fun getText(): String = "hello"

    override fun isAvailable(p0: Project, p1: Editor?, p2: PsiFile?): Boolean = true

    override fun invoke(p0: Project, p1: Editor?, p2: PsiFile?) {
        throw IncorrectOperationException("Not implemented")
    }

    override fun getDelegate(): FixCIPEInAIAssistantIntention = intention
    override fun actionPerformed(p0: AnActionEvent) {
        intention.invoke(p0.project ?: return, null, null)
    }
}
