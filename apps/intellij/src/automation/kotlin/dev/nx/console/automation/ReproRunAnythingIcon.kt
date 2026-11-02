package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.isPluginLoaded
import com.intellij.driver.sdk.jdk.getSystemProperty
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.singleProject
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes

@Remote("com.intellij.openapi.actionSystem.ActionManager")
interface RunAnythingIconActionManager {
    fun getAction(id: String): RunAnythingIconAction?
}

@Remote("com.intellij.openapi.actionSystem.AnAction")
interface RunAnythingIconAction {
    fun getTemplatePresentation(): RunAnythingIconPresentation
}

@Remote("com.intellij.openapi.actionSystem.Presentation")
interface RunAnythingIconPresentation {
    fun getIcon(): RunAnythingIcon?
}

@Remote("javax.swing.Icon")
interface RunAnythingIcon {
    fun getIconWidth(): Int
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface RunAnythingIconFileSystem {
    fun getInstance(): RunAnythingIconFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    check(isPluginLoaded("dev.nx.console")) { "Nx Console must be loaded before this reproduction" }
    val project = singleProject()
    val evidence = Path.of(project.getBasePath(), "run-anything-icon-diagnostic.txt")
    val actionId = "dev.nx.console.run.actions.NxRunAnythingAction"
    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "run-anything-icon") {
        val result = runCatching {
            withContext(OnDispatcher.EDT) {
                checkNotNull(service<RunAnythingIconActionManager>().getAction(actionId)) {
                        "Nx Run Anything action is not registered"
                    }
                    .getTemplatePresentation()
                    .getIcon()
                    ?.getIconWidth()
            }
        }
        val log = Path.of(getSystemProperty("idea.log.path"), "idea.log").readText()
        val currentSession = log.substring(log.lastIndexOf("IDE STARTED").coerceAtLeast(0))
        val iconErrors =
            currentSession
                .lines()
                .filter {
                    it.contains("Icon cannot be found in 'AllIcons.Actions.Run_anything'") ||
                        it.contains("NoSuchFieldException: Run_anything")
                }
                .distinct()
        val report =
            "Run Anything icon: actual IDE action registration diagnostic\n\n" +
                "IDE: ${getProductVersion()}\nAction: $actionId\n" +
                "Icon width: ${result.getOrNull()}\n" +
                "Error: ${result.exceptionOrNull()?.message ?: "none"}\n" +
                "Current IDE session icon loading errors: ${iconErrors.size}\n" +
                iconErrors.joinToString("\n") +
                "\n"
        println(report)
        evidence.writeText(report)
        utility<RunAnythingIconFileSystem>()
            .getInstance()
            .refreshAndFindFileByPath(evidence.toString())
        openFile(evidence.fileName.toString())
        Thread.sleep(3000)
        check(iconErrors.isEmpty()) {
            "Run Anything icon lookup failed; the IDE supplied a fallback icon"
        }
        check((result.getOrNull() ?: 0) > 0) { "Run Anything failed to load its registered icon" }
        invokeAction(actionId, component = ui.x("//div[@class='IdeFrameImpl']").component)
        Thread.sleep(3000)
    }
}
