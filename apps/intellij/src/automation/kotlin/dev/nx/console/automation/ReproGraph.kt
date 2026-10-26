package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.ActionManager
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.components.common.jcef
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.awt.event.InputEvent
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.openapi.wm.impl.IdeFrameImpl")
interface GraphIdeFrame {
    fun setExtendedState(state: Int)

    fun toFront()

    fun getBalloonLayout(): GraphBalloonLayout
}

@Remote("com.intellij.ui.BalloonLayoutImpl")
interface GraphBalloonLayout {
    fun closeAll()
}

@Remote("com.intellij.ide.DataManager")
interface GraphDataManager {
    fun getDataContext(component: Component): GraphDataContext
}

@Remote("com.intellij.openapi.actionSystem.DataContext") interface GraphDataContext

@Remote("com.intellij.openapi.actionSystem.Presentation") interface GraphPresentation

@Remote("com.intellij.openapi.actionSystem.AnActionEvent")
interface GraphActionEvent {
    fun isFromContextMenu(): Boolean

    fun createFromInputEvent(
        input: InputEvent?,
        place: String,
        presentation: GraphPresentation,
        context: GraphDataContext,
        contextMenu: Boolean,
        toolbar: Boolean,
    ): GraphActionEvent
}

@Remote("com.intellij.openapi.actionSystem.AnAction")
interface GraphAction {
    fun getTemplatePresentation(): GraphPresentation

    fun actionPerformed(event: GraphActionEvent)
}

private const val FULL_GRAPH_ACTION = "dev.nx.console.graph.actions.NxGraphSelectAllAction"
private const val FOCUS_PROJECT_ACTION = "dev.nx.console.graph.actions.NxGraphFocusProjectAction"

private fun Driver.focusDemo() {
    openFile("demo/project.json")
    withContext(OnDispatcher.EDT) {
        val manager = service<ActionManager>()
        val action = cast(checkNotNull(manager.getAction(FOCUS_PROJECT_ACTION)), GraphAction::class)
        val context =
            service<GraphDataManager>()
                .getDataContext(ui.x("//div[@class='EditorComponentImpl']").component)
        val event =
            utility<GraphActionEvent>()
                .createFromInputEvent(
                    null,
                    "EditorPopup",
                    action.getTemplatePresentation(),
                    context,
                    true,
                    false,
                )
        check(event.isFromContextMenu())
        action.actionPerformed(event)
    }
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, GraphIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    closeToolWindow("Project")
    val output =
        automationOutput().resolve("graph-${System.currentTimeMillis()}").createDirectories()
    fun observe(step: String, expected: String) {
        val graph = ui.jcef()
        val deadline = System.nanoTime() + 30.seconds.inWholeNanoseconds
        var selected = ""
        do {
            selected =
                runCatching {
                        graph.jcefWorker.callJs(
                            "[...document.querySelectorAll('button[aria-pressed=true]')].map(e => e.textContent.trim()).sort().join(',')",
                            1000,
                        )
                    }
                    .getOrDefault("")
            if (selected == expected) break
            Thread.sleep(250)
        } while (System.nanoTime() < deadline)
        val state =
            graph.jcefWorker.callJs(
                "JSON.stringify({href:location.href,selected:[...document.querySelectorAll('button[aria-pressed=true]')].map(e => e.textContent.trim()).sort(),text:document.body.innerText})",
                5000,
            )
        output.resolve("$step.json").writeText(state)
        println("$step: $state")
        check(selected == expected) { "$step: expected $expected; got $selected" }
        Thread.sleep(2000)
    }
    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "graph-investigation") {
        invokeAction("CloseAllEditors", component = frame)
        Thread.sleep(1500)
        invokeAction(FULL_GRAPH_ACTION, component = frame)
        observe("01-cold-full", "core,demo,ui,unrelated")
        focusDemo()
        observe("02-focus-demo", "demo,ui")
        invokeAction("CloseAllEditors", component = frame)
        Thread.sleep(1500)
        focusDemo()
        observe("03-cold-focus", "demo,ui")
        invokeAction(FULL_GRAPH_ACTION, component = frame)
        observe("04-full-after-focus", "core,demo,ui,unrelated")
        ui.jcef()
            .jcefWorker
            .callJs("document.querySelector('button[title=\"Hide demo\"]').click(); 'hidden'", 5000)
        observe("05-hide-demo", "core,ui,unrelated")
        invokeAction(FULL_GRAPH_ACTION, component = frame)
        observe("06-full-after-hide", "core,demo,ui,unrelated")
        inspectIde()
        println("Graph reproduction artifacts: $output")
    }
}
