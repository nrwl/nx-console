package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.singleProject
import com.intellij.driver.sdk.waitForProjectOpen
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("java.lang.Class")
interface DebugHintClass {
    fun forName(name: String): DebugHintClass

    fun getField(name: String): DebugHintField
}

@Remote("java.lang.reflect.Field")
interface DebugHintField {
    fun get(receiver: DebugHintClass?): DebugHintTopic
}

@Remote("com.intellij.util.messages.Topic") interface DebugHintTopic

@Remote("com.intellij.notification.Notifications") interface DebugHintListener

@Remote("java.util.concurrent.atomic.AtomicReference")
interface DebugHintCapture {
    fun get(): DebugHintNotification?
}

@Remote("java.beans.EventHandler")
interface DebugHintEventHandler {
    fun create(
        listener: DebugHintClass,
        target: DebugHintCapture,
        action: String,
        eventPropertyName: String,
        listenerMethodName: String,
    ): DebugHintListener
}

@Remote("com.intellij.openapi.project.Project")
interface DebugHintProject {
    fun getMessageBus(): DebugHintBus
}

@Remote("com.intellij.util.messages.MessageBus")
interface DebugHintBus {
    fun connect(): DebugHintConnection
}

@Remote("com.intellij.util.messages.MessageBusConnection")
interface DebugHintConnection {
    fun subscribe(topic: DebugHintTopic, listener: DebugHintListener)

    fun disconnect()
}

@Remote("com.intellij.ide.util.PropertiesComponent")
interface DebugHintProperties {
    fun unsetValue(name: String)
}

@Remote("com.intellij.execution.ExecutionManager")
interface DebugHintExecutionManager {
    fun getRunningProcesses(): Array<DebugHintProcess>
}

@Remote("com.intellij.execution.process.ProcessHandler")
interface DebugHintProcess {
    fun isProcessTerminated(): Boolean
}

@Remote("com.intellij.execution.executors.DefaultDebugExecutor")
interface DebugHintExecutor {
    fun getDebugExecutorInstance(): DebugHintExecutor
}

@Remote("dev.nx.console.run.NxTaskExecutionManager", plugin = "dev.nx.console")
interface DebugHintExecution {
    fun execute(
        nxProject: String,
        nxTarget: String,
        configuration: String,
        args: List<String>,
        executor: DebugHintExecutor,
    )
}

@Remote("com.intellij.openapi.wm.ToolWindowManager")
interface DebugHintWindows {
    fun getInstance(project: Project): DebugHintWindowManagerImpl

    fun getToolWindow(id: String): DebugHintWindow?
}

@Remote("com.intellij.openapi.wm.ToolWindow")
interface DebugHintWindow {
    fun isVisible(): Boolean
}

@Remote("com.intellij.openapi.wm.impl.ToolWindowManagerImpl")
interface DebugHintWindowManagerImpl {
    fun getToolWindowBalloon(id: String): DebugHintBalloon?
}

@Remote("com.intellij.openapi.ui.popup.Balloon")
interface DebugHintBalloon {
    fun isDisposed(): Boolean
}

@Remote("com.intellij.notification.Notification")
interface DebugHintNotification {
    fun getContent(): String

    fun getGroupId(): String

    fun getType(): DebugHintType

    fun getActions(): List<DebugHintAction>
}

@Remote("com.intellij.notification.NotificationType")
interface DebugHintType {
    override fun toString(): String
}

@Remote("com.intellij.openapi.actionSystem.AnAction")
interface DebugHintAction {
    fun getTemplateText(): String?
}

@Remote("com.intellij.notification.NotificationGroupManager")
interface DebugHintGroups {
    fun getNotificationGroup(id: String): DebugHintGroup
}

@Remote("com.intellij.notification.NotificationGroup")
interface DebugHintGroup {
    fun getDisplayType(): DebugHintDisplayType

    fun getToolWindowId(): String?
}

@Remote("com.intellij.notification.NotificationDisplayType")
interface DebugHintDisplayType {
    override fun toString(): String
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = singleProject()
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "debug-hint"
    val report = StringBuilder("Debug source-map notification: $label\n")
    var connection: DebugHintConnection? = null
    recordIde(label) {
        try {
            nxlsFrame()
            val interpreter = utility<MissingNodeInterpreterManager>().getInstance(project)
            report.appendLine(
                "Interpreter: ${interpreter.getInterpreterRef().getReferenceName()}; available=${interpreter.isInterpreterAvailable()}"
            )
            if (!interpreter.isInterpreterAvailable()) {
                withContext(OnDispatcher.EDT) {
                    interpreter.setInterpreterRef(
                        utility<MissingNodeInterpreterRef>().create(System.getenv("NX_DEBUG_NODE"))
                    )
                }
            }
            check(interpreter.isInterpreterAvailable()) { "No working Node interpreter" }
            nxlsRunning(project)
            fun resetProperties() =
                withContext(OnDispatcher.EDT) {
                    service<DebugHintProperties>(project).apply {
                        unsetValue("dev.nx.console.hide_debug_source_map_notification")
                        unsetValue("dev.nx.console.last_debug_source_map_notification_time")
                    }
                }
            fun debug() =
                withContext(OnDispatcher.EDT) {
                    service<DebugHintExecution>(project)
                        .execute(
                            "demo",
                            "hello",
                            "",
                            emptyList(),
                            utility<DebugHintExecutor>().getDebugExecutorInstance(),
                        )
                }
            resetProperties()
            val windows = service<DebugHintWindows>(project)
            if (windows.getToolWindow("Debug") == null) {
                report.appendLine("Priming Debug tool window with a first real debug run")
                debug()
                nxlsWait(90.seconds, { "First debug process did not start" }) {
                    service<DebugHintExecutionManager>(project).getRunningProcesses().any {
                        !it.isProcessTerminated()
                    }
                }
                nxlsWait(90.seconds, { "First debug run did not create Debug tool window" }) {
                    windows.getToolWindow("Debug") != null
                }
                nxlsWait(90.seconds, { "First debug process did not finish" }) {
                    service<DebugHintExecutionManager>(project).getRunningProcesses().all {
                        it.isProcessTerminated()
                    }
                }
            }
            openToolWindow("Debug")
            nxlsWait(20.seconds, { "Debug window is not visible" }) {
                windows.getToolWindow("Debug")?.isVisible() == true
            }
            resetProperties()
            val notifications = new(DebugHintCapture::class)
            val listenerClass =
                utility<DebugHintClass>().forName("com.intellij.notification.Notifications")
            val listener =
                utility<DebugHintEventHandler>()
                    .create(listenerClass, notifications, "set", "", "notify")
            connection =
                cast(project, DebugHintProject::class).getMessageBus().connect().also {
                    it.subscribe(listenerClass.getField("TOPIC").get(null), listener)
                }
            report.appendLine(
                "Capture: project Notifications.TOPIC subscription using a JDK EventHandler listener"
            )
            debug()
            var notification: DebugHintNotification? = null
            nxlsWait(90.seconds, { "No source-map notification arrived\n$report" }) {
                notification =
                    notifications.get()?.takeIf {
                        it.getContent().contains("ensure source maps are generated")
                    }
                notification != null
            }
            val hint = checkNotNull(notification)
            val groupId = hint.getGroupId()
            val group = service<DebugHintGroups>().getNotificationGroup(groupId)
            val displayType = group.getDisplayType().toString()
            val windowId = group.getToolWindowId()
            val actions = hint.getActions().map { it.getTemplateText() }
            report.appendLine(
                "groupId=$groupId\ntype=${hint.getType()}\ndisplayType=$displayType\ntoolWindowId=$windowId\nactions=$actions\ncontent=${hint.getContent()}"
            )
            check(hint.getType().toString() == "INFORMATION")
            check(displayType == "TOOL_WINDOW")
            check(windowId == "Debug")
            check(actions == listOf("OK", "Don't show again"))
            nxlsWait(20.seconds, { "Debug balloon is not visible" }) {
                utility<DebugHintWindows>()
                    .getInstance(project)
                    .getToolWindowBalloon("Debug")
                    ?.isDisposed() == false
            }
            report.appendLine("Debug tool window balloon exists and is not disposed")
            inspectIde()
            report.appendLine("PASS")
            // Preserve time for the native balloon and target output to appear in the recording.
            val deadline = System.nanoTime() + 6.seconds.inWholeNanoseconds
            while (System.nanoTime() < deadline) Thread.sleep(250)
        } finally {
            connection?.disconnect()
            println(report)
            automationOutput().resolve("$label.txt").writeText(report.toString())
        }
    }
}
