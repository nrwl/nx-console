package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.model.LockSemantics
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.jdk.getSystemProperty
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.singleProject
import com.intellij.driver.sdk.ui.components.common.jcef
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit
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

@Remote("com.intellij.openapi.project.ProjectManager")
interface LifecycleProjectManager {
    fun getInstance(): LifecycleProjectManager

    fun createProject(name: String, path: String): Project?
}

@Remote("com.intellij.openapi.components.ComponentManagerEx")
interface LifecycleComponents {
    fun stopServicePreloading()
}

@Remote("com.intellij.openapi.Disposable") interface LifecycleDisposable

@Remote("com.intellij.openapi.util.Disposer")
interface LifecycleDisposer {
    fun dispose(disposable: LifecycleDisposable)
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

    fun get(receiver: LifecycleObject): LifecycleObject?

    fun getBoolean(receiver: LifecycleObject): Boolean
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

    fun getURL(): String

    fun getMainFrame(): LifecycleCefFrame?

    fun stopLoad()
}

@Remote("org.cef.browser.CefFrame")
interface LifecycleCefFrame {
    fun getURL(): String
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
    val offset = log.readText().length
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
        var recoveryCompleted = false
        repeat(if (mode == "abort" || mode == "recovery") 8 else 1) {
            if (recoveryCompleted) return@repeat
            val temporaryProjectPath =
                if (mode == "theme") Files.createTempDirectory("nx-browser-theme-") else null
            val browserProject =
                if (temporaryProjectPath != null) {
                    checkNotNull(
                        utility<LifecycleProjectManager>()
                            .getInstance()
                            .createProject("Browser theme", temporaryProjectPath.toString())
                    )
                } else project
            val details =
                withContext(OnDispatcher.EDT) {
                    new(LifecycleDetailsBrowser::class, browserProject, file)
                }
            var content: LifecycleContent? = null
            try {
                val cef =
                    withContext(OnDispatcher.EDT) {
                        val reflected = cast(details, LifecycleObject::class)
                        val field = reflected.getClass().getDeclaredField("browser")
                        field.setAccessible(true)
                        cast(checkNotNull(field.get(reflected)), LifecycleJcefBrowser::class)
                    }
                if (mode == "theme") {
                    check(!cef.isCefBrowserCreated()) {
                        "Expected a deferred native browser before attachment"
                    }
                    val listenerDeadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20)
                    while (true) {
                        val listening =
                            withContext(OnDispatcher.EDT) {
                                val reflected = cast(details, LifecycleObject::class)
                                val field =
                                    reflected.getClass().getDeclaredField("messageBusConnection")
                                field.setAccessible(true)
                                field.get(reflected) != null
                            }
                        if (listening) break
                        check(System.nanoTime() < listenerDeadline) {
                            "Project details never registered its settings listener"
                        }
                        Thread.sleep(50)
                    }
                    Thread.sleep(200)
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
                var stopped = false
                if (mode == "abort" || mode == "recovery") {
                    for (attempt in 0 until 500) {
                        if (
                            cef.isCefBrowserCreated() &&
                                cef.getCefBrowser().isLoading() &&
                                (mode != "recovery" ||
                                    cef.getCefBrowser().getURL().contains("nx-console-"))
                        ) {
                            cef.getCefBrowser().stopLoad()
                            interceptedLoads++
                            stopped = true
                            break
                        }
                        Thread.sleep(10)
                    }
                }
                if (mode == "load" || mode == "recovery") {
                    val loaded = {
                        withContext(OnDispatcher.EDT) {
                            val reflected = cast(details, LifecycleObject::class)
                            val field =
                                reflected.getClass().getDeclaredField("projectDetailsLoaded")
                            field.setAccessible(true)
                            field.getBoolean(reflected)
                        }
                    }
                    if (mode == "recovery") {
                        Thread.sleep(250)
                        if (!stopped || loaded()) {
                            println(
                                "Navigation completed before stop; retrying the recovery trigger"
                            )
                            return@repeat
                        }
                        invokeAction(
                            "dev.nx.console.nxls.NxRefreshWorkspaceAction",
                            component = ui.x("//div[@class='IdeFrameImpl']").component,
                        )
                    }
                    val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20)
                    while (!loaded() && System.nanoTime() < deadline) Thread.sleep(100)
                    println(
                        "Native URL: ${cef.getCefBrowser().getURL()}; main-frame URL: ${cef.getCefBrowser().getMainFrame()?.getURL()}"
                    )
                    check(loaded()) { "Project-details load never completed after $mode" }
                    println("Project-details load completed: true ($mode)")
                    var rendered = ""
                    while (System.nanoTime() < deadline) {
                        rendered = ui.jcef().jcefWorker.callJs("document.body.innerText", 5000)
                        if (rendered.contains("hello")) break
                        Thread.sleep(100)
                    }
                    println("Rendered project details: $rendered")
                    check(rendered.contains("hello")) {
                        "Project details did not render the hello target"
                    }
                    if (mode == "recovery") recoveryCompleted = true
                }
                Thread.sleep(1500)
            } finally {
                withContext(OnDispatcher.EDT) {
                    content?.let { manager.removeContent(it, true) }
                    details.dispose()
                }
                if (temporaryProjectPath != null) {
                    cast(browserProject, LifecycleComponents::class).stopServicePreloading()
                    withContext(OnDispatcher.EDT, LockSemantics.WRITE_ACTION) {
                        utility<LifecycleDisposer>()
                            .dispose(cast(browserProject, LifecycleDisposable::class))
                    }
                    temporaryProjectPath.toFile().deleteRecursively()
                }
            }
        }
        check(mode != "recovery" || recoveryCompleted) {
            "No aborted navigation recovered and rendered its targets"
        }
        check(mode != "abort" || interceptedLoads > 0) {
            "Did not intercept a loading browser; this run did not reproduce the abort trigger"
        }
        Thread.sleep(1000)
        val addedLog = log.readText().drop(offset)
        check(!addedLog.contains("The related JCEF browser in not initialized")) {
            "Theme notification executed JavaScript before native browser creation"
        }
        check(
            !addedLog.contains("browser failed to load, error code: ERR_ABORTED") &&
                !addedLog.contains("Browser failed to load: ERR_ABORTED")
        ) {
            "Expected navigation cancellation was reported as a browser error"
        }
        check(!addedLog.contains("Already resumed")) {
            "Multiple CEF callbacks resumed the same waiter"
        }
    }
}
