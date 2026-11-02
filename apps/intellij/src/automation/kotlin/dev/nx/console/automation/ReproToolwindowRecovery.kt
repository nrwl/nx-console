package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.jdk.getSystemProperty
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.singleProject
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("dev.nx.console.nx_toolwindow.NxToolMainComponents", plugin = "dev.nx.console")
interface RecoveryComponents {
    fun createNoNodeInterpreterComponent(): Component

    fun createDaemonWarningBanner(type: RecoveryWarningType): Component
}

@Remote("dev.nx.console.nx_toolwindow.DaemonWarningType", plugin = "dev.nx.console")
interface RecoveryWarningType {
    fun valueOf(name: String): RecoveryWarningType
}

@Remote("com.intellij.openapi.wm.ToolWindowManager")
interface RecoveryWindowManager {
    fun getInstance(project: Project): RecoveryWindowManager

    fun getToolWindow(id: String): RecoveryWindow
}

@Remote("com.intellij.openapi.wm.ToolWindow")
interface RecoveryWindow {
    fun getContentManager(): RecoveryContentManager
}

@Remote("com.intellij.ui.content.ContentFactory")
interface RecoveryContentFactory {
    fun getInstance(): RecoveryContentFactory

    fun createContent(component: Component, name: String, lockable: Boolean): RecoveryContent
}

@Remote("com.intellij.ui.content.Content") interface RecoveryContent

@Remote("com.intellij.ui.content.ContentManager")
interface RecoveryContentManager {
    fun addContent(content: RecoveryContent)

    fun setSelectedContent(content: RecoveryContent)

    fun removeContent(content: RecoveryContent, dispose: Boolean): Boolean
}

@Remote("javax.swing.AbstractButton")
interface RecoveryButton {
    fun doClick()
}

@Remote("com.intellij.openapi.fileEditor.FileEditorManager")
interface RecoveryEditors {
    fun getInstance(project: Project): RecoveryEditors

    fun getOpenFiles(): Array<RecoveryFile>
}

@Remote("com.intellij.openapi.vfs.VirtualFile")
interface RecoveryFile {
    fun getPath(): String
}

/** Displays the real recovery component without changing the user's configured interpreter. */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = singleProject()
    val mode = System.getenv("NX_RECOVERY_CASE") ?: "daemon"
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "toolwindow-$mode"
    val workspace = Path.of(checkNotNull(System.getenv("NX_AUTOMATION_PROJECT")))
    val log = Path.of(getSystemProperty("idea.log.path"), "idea.log")
    val offset = Files.size(log)
    val manager =
        utility<RecoveryWindowManager>()
            .getInstance(project)
            .getToolWindow("Nx Console")
            .getContentManager()
    var content: RecoveryContent? = null
    recordIde(label) {
        try {
            openToolWindow("Nx Console")
            content =
                withContext(OnDispatcher.EDT) {
                    val components = new(RecoveryComponents::class, project)
                    val component =
                        if (mode == "node") {
                            components.createNoNodeInterpreterComponent()
                        } else {
                            components.createDaemonWarningBanner(
                                utility<RecoveryWarningType>().valueOf("DAEMON_DISABLED")
                            )
                        }
                    utility<RecoveryContentFactory>()
                        .getInstance()
                        .createContent(component, "Recovery check", false)
                        .also {
                            manager.addContent(it)
                            manager.setSelectedContent(it)
                        }
                }
            Thread.sleep(1500)
            if (mode == "node") {
                ui.x("//div[@class='JButton' and @text='Configure Node interpreter']").click()
                val deadline = System.nanoTime() + 20.seconds.inWholeNanoseconds
                while (
                    !ui.x("//div[@class='SettingsDialog']").present() &&
                        System.nanoTime() < deadline
                ) Thread.sleep(200)
                check(ui.x("//div[@class='SettingsDialog']").present()) {
                    "Configure Node interpreter did not open settings"
                }
                Thread.sleep(2500)
                ui.x("//div[@class='JButton' and @text='Cancel']").click()
            } else {
                val disabled = workspace.resolve(".nx/workspace-data/d/disabled")
                disabled.parent.createDirectories()
                val previous = if (Files.exists(disabled)) Files.readAllBytes(disabled) else null
                try {
                    disabled.writeText("Nx daemon disabled: regression fixture\n")
                    withContext(OnDispatcher.EDT) {
                        cast(
                                ui.x("//div[@class='JButton' and @tooltiptext='Show Reason']")
                                    .component,
                                RecoveryButton::class,
                            )
                            .doClick()
                    }
                    val deadline = System.nanoTime() + 20.seconds.inWholeNanoseconds
                    while (
                        System.nanoTime() < deadline &&
                            !withContext(OnDispatcher.EDT) {
                                utility<RecoveryEditors>().getInstance(project).getOpenFiles().any {
                                    it.getPath() == disabled.toString()
                                }
                            }
                    ) Thread.sleep(200)
                    check(
                        withContext(OnDispatcher.EDT) {
                            utility<RecoveryEditors>().getInstance(project).getOpenFiles().any {
                                it.getPath() == disabled.toString()
                            }
                        }
                    ) {
                        "Show Reason did not open the newly created daemon disabled file"
                    }
                    Thread.sleep(2500)
                } finally {
                    if (previous == null) Files.deleteIfExists(disabled)
                    else Files.write(disabled, previous)
                }
            }
            val newLog = log.readText().drop(offset.toInt())
            check(!newLog.contains("Slow operations are prohibited on EDT")) {
                "Recovery action performed filesystem work on EDT"
            }
            check(!newLog.contains("Cannot find configurable")) {
                "Node settings navigation failed"
            }
        } finally {
            content?.let { withContext(OnDispatcher.EDT) { manager.removeContent(it, true) } }
        }
    }
}
