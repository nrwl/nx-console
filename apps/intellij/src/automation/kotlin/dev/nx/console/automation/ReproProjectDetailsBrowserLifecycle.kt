package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.jdk.getSystemProperty
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.singleProject
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.readText
import kotlin.time.Duration.Companion.minutes

@Remote(
    "dev.nx.console.project_details.browsers.NewProjectDetailsBrowser",
    plugin = "dev.nx.console",
)
interface LifecycleDetailsBrowser {
    fun getComponent(): Component

    fun dispose()
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface LifecycleFileSystem {
    fun getInstance(): LifecycleFileSystem

    fun refreshAndFindFileByPath(path: String): LifecycleFile?
}

@Remote("com.intellij.openapi.vfs.VirtualFile") interface LifecycleFile

@Remote("com.intellij.ide.ui.UISettings")
interface LifecycleUiSettings {
    fun getInstance(): LifecycleUiSettings

    fun fireUISettingsChanged()
}

@Remote("java.lang.Class")
interface LifecycleClass {
    fun getDeclaredField(name: String): LifecycleField
}

@Remote("java.lang.reflect.Field")
interface LifecycleField {
    fun setAccessible(value: Boolean)

    fun get(receiver: LifecycleObject): LifecycleObject
}

@Remote("java.lang.Object")
interface LifecycleObject {
    fun getClass(): LifecycleClass
}

@Remote("com.intellij.ui.jcef.JBCefBrowser")
interface LifecycleJcefBrowser {
    fun getCefBrowser(): LifecycleCefBrowser

    fun isCefBrowserCreated(): Boolean
}

@Remote("org.cef.browser.CefBrowser")
interface LifecycleCefBrowser {
    fun isLoading(): Boolean

    fun stopLoad()
}

@Remote("com.intellij.openapi.wm.ToolWindowManager")
interface LifecycleWindowManager {
    fun getInstance(project: Project): LifecycleWindowManager

    fun getToolWindow(id: String): LifecycleWindow
}

@Remote("com.intellij.openapi.wm.ToolWindow")
interface LifecycleWindow {
    fun getContentManager(): LifecycleContentManager
}

@Remote("com.intellij.ui.content.ContentFactory")
interface LifecycleContentFactory {
    fun getInstance(): LifecycleContentFactory

    fun createContent(component: Component, name: String, lockable: Boolean): LifecycleContent
}

@Remote("com.intellij.ui.content.Content") interface LifecycleContent

@Remote("com.intellij.ui.content.ContentManager")
interface LifecycleContentManager {
    fun addContent(content: LifecycleContent)

    fun setSelectedContent(content: LifecycleContent)

    fun removeContent(content: LifecycleContent, dispose: Boolean): Boolean
}

/** Exercises settings events before attachment and cancellation during a real PDV page load. */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = singleProject()
    val workspace = Path.of(checkNotNull(System.getenv("NX_AUTOMATION_PROJECT")))
    val file =
        checkNotNull(
            utility<LifecycleFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(workspace.resolve("demo/project.json").toString())
        )
    val log = Path.of(getSystemProperty("idea.log.path"), "idea.log")
    val offset = Files.size(log)
    val mode = System.getenv("NX_BROWSER_CASE") ?: "theme"
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "project-details-$mode"
    recordIde(label) {
        openToolWindow("Nx Console")
        val manager =
            utility<LifecycleWindowManager>()
                .getInstance(project)
                .getToolWindow("Nx Console")
                .getContentManager()
        var interceptedLoads = 0
        repeat(if (mode == "abort") 8 else 1) {
            val details =
                withContext(OnDispatcher.EDT) { new(LifecycleDetailsBrowser::class, project, file) }
            var content: LifecycleContent? = null
            try {
                val cef =
                    withContext(OnDispatcher.EDT) {
                        val reflected = cast(details, LifecycleObject::class)
                        val field = reflected.getClass().getDeclaredField("browser")
                        field.setAccessible(true)
                        cast(field.get(reflected), LifecycleJcefBrowser::class)
                    }
                if (mode == "theme") {
                    check(!cef.isCefBrowserCreated()) {
                        "Expected a deferred native browser before attachment"
                    }
                    repeat(10) {
                        withContext(OnDispatcher.EDT) {
                            utility<LifecycleUiSettings>().getInstance().fireUISettingsChanged()
                        }
                        Thread.sleep(100)
                    }
                }
                content =
                    withContext(OnDispatcher.EDT) {
                        utility<LifecycleContentFactory>()
                            .getInstance()
                            .createContent(
                                details.getComponent(),
                                "Project details lifecycle",
                                false,
                            )
                            .also {
                                manager.addContent(it)
                                manager.setSelectedContent(it)
                            }
                    }
                if (mode == "abort") {
                    for (attempt in 0 until 100) {
                        if (cef.isCefBrowserCreated() && cef.getCefBrowser().isLoading()) {
                            cef.getCefBrowser().stopLoad()
                            interceptedLoads++
                            break
                        }
                        Thread.sleep(10)
                    }
                }
                Thread.sleep(1500)
            } finally {
                withContext(OnDispatcher.EDT) {
                    content?.let { manager.removeContent(it, true) }
                    details.dispose()
                }
            }
        }
        check(mode != "abort" || interceptedLoads > 0) {
            "Did not intercept a loading browser; this run did not reproduce the abort trigger"
        }
        Thread.sleep(1000)
        val addedLog = log.readText().drop(offset.toInt())
        check(!addedLog.contains("The related JCEF browser in not initialized")) {
            "Theme notification executed JavaScript before native browser creation"
        }
        check(!addedLog.contains("browser failed to load, error code: ERR_ABORTED")) {
            "Expected navigation cancellation was reported as a browser error"
        }
        check(!addedLog.contains("Already resumed")) {
            "Multiple CEF callbacks resumed the same waiter"
        }
    }
}
