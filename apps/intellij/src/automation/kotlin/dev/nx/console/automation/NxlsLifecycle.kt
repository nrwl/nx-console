package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.nanoseconds
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.notification.EventLog")
interface NxlsEventLog {
    fun getLogModel(project: Project): NxlsLogModel
}

@Remote("StandardNxGraphServer", plugin = "dev.nx.console")
interface NxlsGraphServer {
    fun getCurrentPort(): Int?
}

@Remote("com.intellij.notification.LogModel")
interface NxlsLogModel {
    fun getNotifications(): List<NxlsNotification>
}

@Remote("com.intellij.notification.Notification")
interface NxlsNotification {
    fun getContent(): String
}

@Remote("java.lang.System")
interface NxlsIdentity {
    fun identityHashCode(editor: NxlsEditor): Int

    fun identityHashCode(notification: NxlsNotification): Int

    fun identityHashCode(root: NxlsTreeRoot): Int
}

@Remote("javax.swing.JTree")
interface NxlsSwingTree {
    fun getModel(): NxlsTreeModel
}

@Remote("javax.swing.tree.TreeModel")
interface NxlsTreeModel {
    fun getRoot(): NxlsTreeRoot
}

@Remote("java.lang.Object") interface NxlsTreeRoot

private fun Driver.treeRootIdentity(): Int =
    withContext(OnDispatcher.EDT) {
        val tree = cast(ui.x("//div[@class='NxProjectsTree']").component, NxlsSwingTree::class)
        utility<NxlsIdentity>().identityHashCode(tree.getModel().getRoot())
    }

@Remote("dev.nx.console.nxls.NxlsService", plugin = "dev.nx.console")
interface NxlsServiceClass {
    fun getClass(): NxlsServiceJavaClass
}

@Remote("java.lang.Class")
interface NxlsServiceJavaClass {
    fun getDeclaredField(name: String): NxlsTopicField
}

@Remote("java.lang.reflect.Field")
interface NxlsTopicField {
    fun setAccessible(accessible: Boolean)

    fun get(receiver: NxlsServiceClass?): NxlsRefreshTopic
}

@Remote("com.intellij.util.messages.Topic") interface NxlsRefreshTopic

@Remote("com.intellij.openapi.project.Project")
interface NxlsBusProject {
    fun getMessageBus(): NxlsMessageBus
}

@Remote("com.intellij.util.messages.impl.MessageBusImpl")
interface NxlsMessageBus {
    fun `computeSubscribers$intellij_platform_core`(topic: NxlsRefreshTopic): Array<NxlsSubscriber>
}

@Remote("java.lang.Object")
interface NxlsSubscriber {
    fun getClass(): NxlsSubscriberClass
}

@Remote("java.lang.Class")
interface NxlsSubscriberClass {
    fun getName(): String
}

@Remote("com.intellij.ide.util.PropertiesComponent")
interface NxlsProperties {
    fun getBoolean(name: String): Boolean

    fun setValue(name: String, value: Boolean)
}

private fun Driver.refreshSubscribers(project: Project): Map<String, Map<String, Int>> =
    withContext(OnDispatcher.EDT) {
        val serviceClass = service<NxlsServiceClass>(project).getClass()
        val bus = cast(project, NxlsBusProject::class).getMessageBus()
        listOf("NX_WORKSPACE_REFRESH_TOPIC", "NX_WORKSPACE_REFRESH_STARTED_TOPIC").associateWith {
            name ->
            // Driver cannot install a listener lambda; inspect existing listeners without adding a
            // test subscription.
            val field = serviceClass.getDeclaredField(name)
            field.setAccessible(true)
            bus.`computeSubscribers$intellij_platform_core`(field.get(null))
                .map { it.getClass().getName() }
                .groupingBy { it }
                .eachCount()
        }
    }

private const val REFRESH_SUCCESS = "Successfully refreshed Nx workspace"

private fun Driver.refreshNotifications(project: Project): Map<Int, String> =
    withContext(OnDispatcher.EDT) {
        utility<NxlsEventLog>().getLogModel(project).getNotifications().associate {
            utility<NxlsIdentity>().identityHashCode(it) to it.getContent()
        }
    }

private fun Driver.edtProbe(project: Project, step: String, report: StringBuilder) {
    val start = System.nanoTime()
    withContext(OnDispatcher.EDT) { service<EditorFreezeNxlsService>(project).isStarted() }
    val elapsed = (System.nanoTime() - start).nanoseconds
    report.appendLine("EDT $step: $elapsed")
    check(elapsed < 2.seconds) { "EDT round trip exceeded 2s at '$step': $elapsed" }
}

private fun <T> Driver.lifecycleStep(
    project: Project,
    name: String,
    report: StringBuilder,
    block: () -> T,
): T {
    edtProbe(project, "before $name", report)
    return try {
        block()
    } finally {
        edtProbe(project, "after $name", report)
    }
}

private fun Driver.checkOpenEditors(
    project: Project,
    editors: Map<NxlsConfigCase, NxlsEditor>,
    report: StringBuilder,
): Long {
    val generations = mutableSetOf<Long>()
    for ((case, editor) in editors) {
        lifecycleStep(project, "completion/hover ${case.path}", report) {
            val identity = utility<NxlsIdentity>().identityHashCode(editor)
            val file = checkNotNull(service<NxlsDocuments>().getFile(editor.getDocument()))
            check(service<NxlsEditors>(project).isFileOpen(file) && !editor.isDisposed()) {
                "${case.path} was closed during refresh"
            }
            // Selecting an existing tab must not conceal a lost connection by creating a new
            // editor.
            openFile(case.path)
            check(utility<NxlsIdentity>().identityHashCode(nxlsEditor(project)) == identity) {
                "${case.path} was reopened in a new editor"
            }
            val original = nxlsText(editor)
            try {
                nxlsPrepareCase(editor, case)
                val (_, items) = nxlsCompletion(project, editor, case.key)
                generations +=
                    items
                        .first { it.getObject().getCompletionItem().getLabel() == case.key }
                        .getObject()
                        .getLspServer()
                        .getDescriptor()
                        .getGeneration()
                nxlsHideLookup(project)
                report.appendLine(nxlsDocumentation(editor, case.hover, case.documentation))
                if (case.path != "nx.json") {
                    report.appendLine(
                        nxlsDocumentation(editor, "nx:run-commands", "nx.dev", link = true)
                    )
                }
            } finally {
                nxlsHideLookup(project)
                nxlsReplace(editor, original, 0)
                withWriteAction { service<NxlsDocuments>().saveDocument(editor.getDocument()) }
            }
        }
    }
    check(generations.size == 1) {
        "Open editors are attached to different server generations: $generations"
    }
    return generations.single()
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val frame = nxlsFrame()
    val report = StringBuilder()
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "nxls-lifecycle"
    nxlsWithFolderTree(project) {
        recordIde(label) {
            val autoSave = service<NxlsAutoSave>().disableAutoSave()
            val properties = service<NxlsProperties>(project)
            val hideRefreshKey = "dev.nx.console.hide_nx_refresh_notification"
            val wasHidden = properties.getBoolean(hideRefreshKey)
            properties.setValue(hideRefreshKey, false)
            try {
                lifecycleStep(project, "initial tree", report) {
                    nxlsRunning(project)
                    openToolWindow("Nx Console")
                    report.appendLine("Initial tree: ${nxlsTree()}")
                }
                val editors =
                    nxlsConfigCases.associateWith { case ->
                        lifecycleStep(project, "open ${case.path}", report) {
                            openFile(case.path)
                            nxlsEditor(project).also {
                                check(
                                    !service<NxlsDocuments>().isDocumentUnsaved(it.getDocument())
                                ) {
                                    "Save ${case.path} before running"
                                }
                            }
                        }
                    }
                var generation = checkOpenEditors(project, editors, report)
                // Refresh initializes this lazy service; include its listener in the baseline.
                service<NxlsGraphServer>(project).getCurrentPort()
                val subscriptions = refreshSubscribers(project)
                check(subscriptions.values.all { it.isNotEmpty() }) {
                    "No refresh subscribers: $subscriptions"
                }
                report.appendLine("Refresh subscribers: $subscriptions")
                repeat(3) { index ->
                    val before = refreshNotifications(project).keys
                    val rootBefore = treeRootIdentity()
                    lifecycleStep(project, "refresh ${index + 1}", report) {
                        invokeAction(
                            "dev.nx.console.nxls.NxRefreshWorkspaceAction",
                            component = frame,
                        )
                        nxlsWait(
                            3.minutes,
                            {
                                "Refresh ${index + 1} did not complete; notifications: ${refreshNotifications(project)}"
                            },
                        ) {
                            edtProbe(project, "refresh ${index + 1} pending", report)
                            val fresh =
                                refreshNotifications(project).filterKeys { it !in before }.values
                            check(fresh.none { it.contains("Error refreshing workspace") }) {
                                "Refresh failed: $fresh"
                            }
                            fresh.any { it.contains(REFRESH_SUCCESS) }
                        }
                        nxlsRunning(project)
                        nxlsWait(
                            message = {
                                "Refresh ${index + 1} did not rebuild the rendered tree model"
                            }
                        ) {
                            edtProbe(project, "refresh ${index + 1} tree rebuild", report)
                            treeRootIdentity() != rootBefore
                        }
                        report.appendLine("After refresh ${index + 1}: ${nxlsTree()}")
                    }
                    val next = checkOpenEditors(project, editors, report)
                    check(next > generation) {
                        "Refresh ${index + 1} left editors on old generation $generation (now $next)"
                    }
                    generation = next
                    val subscribersAfter = refreshSubscribers(project)
                    check(subscribersAfter == subscriptions) {
                        "Refresh subscriptions changed: before=$subscriptions, after=$subscribersAfter"
                    }
                    val successes =
                        refreshNotifications(project)
                            .filterKeys { it !in before }
                            .values
                            .count { it.contains(REFRESH_SUCCESS) }
                    check(successes == 1) {
                        "Refresh ${index + 1} produced $successes success notifications"
                    }
                    report.appendLine(
                        "Refresh ${index + 1}: exactly one success, generation=$generation, original editors still functional"
                    )
                }
            } finally {
                properties.setValue(hideRefreshKey, wasHidden)
                autoSave.finish()
                automationOutput()
                    .resolve("$label-${System.currentTimeMillis()}.txt")
                    .writeText(report.toString())
            }
        }
    }
}
