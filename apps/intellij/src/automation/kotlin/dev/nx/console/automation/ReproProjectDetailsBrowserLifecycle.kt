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
    fun getName(): String

    fun forName(name: String, initialize: Boolean, loader: LifecycleClassLoader): LifecycleClass

    fun getClassLoader(): LifecycleClassLoader

    fun newInstance(): LifecycleObject

    fun getDeclaredField(name: String): LifecycleField
}

@Remote("java.lang.System")
interface LifecycleEnvironment {
    fun getenv(name: String): String?
}

@Remote("java.awt.Toolkit")
interface LifecycleToolkit {
    fun getDefaultToolkit(): LifecycleObject
}

@Remote("java.lang.reflect.Field")
interface LifecycleField {
    fun setAccessible(value: Boolean)

    fun get(receiver: LifecycleObject): LifecycleObject?

    fun getBoolean(receiver: LifecycleObject): Boolean
}

@Remote("java.lang.reflect.Field")
interface LifecycleStringField {
    fun get(receiver: LifecycleObject): String?
}

@Remote("java.lang.Object")
interface LifecycleObject {
    fun getClass(): LifecycleClass
}

@Remote("com.intellij.ui.jcef.JBCefBrowser")
interface LifecycleJcefBrowser {
    fun getComponent(): Component

    fun getJBCefClient(): LifecycleJcefClient

    fun getProperty(name: String): LifecycleObject?

    fun getCefBrowser(): LifecycleCefBrowser

    fun isCefBrowserCreated(): Boolean
}

@Remote("org.cef.handler.CefRequestHandler") interface LifecycleRequestHandler

@Remote("java.lang.ClassLoader") interface LifecycleClassLoader

@Remote("java.net.URL") interface LifecycleUrl

@Remote("java.net.URLClassLoader")
interface LifecycleAutomationClassLoader {
    fun close()
}

@Remote("com.intellij.ui.jcef.JBCefClient")
interface LifecycleJcefClient {
    fun addRequestHandler(
        handler: LifecycleRequestHandler,
        browser: LifecycleCefBrowser,
    ): LifecycleJcefClient

    fun removeRequestHandler(handler: LifecycleRequestHandler, browser: LifecycleCefBrowser)
}

@Remote("dev.nx.console.utils.jcef.BrowserLoadHandler", plugin = "dev.nx.console")
interface LifecyclePendingLoad {
    fun getCompletion(): LifecycleLoadCompletion
}

@Remote("kotlinx.coroutines.Deferred")
interface LifecycleLoadCompletion {
    fun isCompleted(): Boolean

    fun getCompleted(): Boolean
}

@Remote("com.intellij.openapi.application.ApplicationInfo")
interface LifecycleApplicationInfo {
    fun getInstance(): LifecycleApplicationInfo

    fun getBuild(): LifecycleBuildNumber
}

@Remote("com.intellij.openapi.util.BuildNumber")
interface LifecycleBuildNumber {
    fun getBaselineVersion(): Int
}

@Remote(
    "com.jetbrains.performancePlugin.remotedriver.jcef.JcefComponentWrapper",
    plugin = "com.jetbrains.performancePlugin/intellij.performanceTesting.remoteDriver",
)
interface LifecycleLegacyJsWorker {
    fun callJs(script: String, timeout: Long): String
}

@Remote(
    "com.intellij.performanceTesting.remoteDriver.jcef.JcefComponentWrapper",
    plugin = "com.jetbrains.performancePlugin/intellij.performanceTesting.remoteDriver.jcef",
)
interface LifecycleJsWorker {
    fun callJs(script: String, timeout: Long): String
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
    println(
        "IDE DISPLAY=${utility<LifecycleEnvironment>().getenv("DISPLAY")}; " +
            "toolkit=${utility<LifecycleToolkit>().getDefaultToolkit().getClass().getName()}"
    )
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
        repeat(if (mode == "abort") 8 else 1) {
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
            var abortHandler: LifecycleRequestHandler? = null
            var recoveryBrowser: LifecycleJcefBrowser? = null
            var automationLoader: LifecycleAutomationClassLoader? = null
            try {
                val cef =
                    withContext(OnDispatcher.EDT) {
                        val reflected = cast(details, LifecycleObject::class)
                        val field = reflected.getClass().getDeclaredField("browser")
                        field.setAccessible(true)
                        cast(checkNotNull(field.get(reflected)), LifecycleJcefBrowser::class)
                    }
                var pendingLoad: LifecycleLoadCompletion? = null
                if (mode == "recovery") {
                    val pendingDeadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(60)
                    while (pendingLoad == null && System.nanoTime() < pendingDeadline) {
                        pendingLoad =
                            withContext(OnDispatcher.EDT) {
                                cef.getProperty("nx.console.htmlLoadTracker")?.let { tracker ->
                                    val field = tracker.getClass().getDeclaredField("current")
                                    field.setAccessible(true)
                                    field.get(tracker)?.let {
                                        cast(it, LifecyclePendingLoad::class).getCompletion()
                                    }
                                }
                            }
                        if (pendingLoad == null) Thread.sleep(100)
                    }
                    checkNotNull(pendingLoad) { "No deferred project-details HTML navigation" }
                    check(!cef.isCefBrowserCreated()) {
                        "Recovery must intercept the first native navigation before attachment"
                    }
                    val automationClasses =
                        Path.of(System.getProperty("nx.console.automation.workspace"))
                            .resolve("dist/apps/intellij/classes/kotlin/automation")
                    automationLoader =
                        new(
                            LifecycleAutomationClassLoader::class,
                            arrayOf(new(LifecycleUrl::class, automationClasses.toUri().toString())),
                            cast(cef, LifecycleObject::class).getClass().getClassLoader(),
                        )
                    // The helper runs inside the IDE and ignores its initial about:blank load.
                    abortHandler =
                        cast(
                            utility<LifecycleClass>()
                                .forName(
                                    "dev.nx.console.automation.AbortProjectDetailsNavigation",
                                    true,
                                    cast(automationLoader, LifecycleClassLoader::class),
                                )
                                .newInstance(),
                            LifecycleRequestHandler::class,
                        )
                    recoveryBrowser = cef
                    cef.getJBCefClient().addRequestHandler(abortHandler, cef.getCefBrowser())
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
                if (mode == "abort") {
                    for (attempt in 0 until 500) {
                        if (cef.isCefBrowserCreated() && cef.getCefBrowser().isLoading()) {
                            cef.getCefBrowser().stopLoad()
                            interceptedLoads++
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
                        val completion = checkNotNull(pendingLoad)
                        val abortDeadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20)
                        while (
                            !completion.isCompleted() && System.nanoTime() < abortDeadline
                        ) Thread.sleep(50)
                        check(completion.isCompleted()) { "Native navigation was not aborted" }
                        val reflectedHandler =
                            cast(checkNotNull(abortHandler), LifecycleObject::class)
                        val abortedUrlField =
                            reflectedHandler.getClass().getDeclaredField("abortedUrl")
                        abortedUrlField.setAccessible(true)
                        val abortedUrl =
                            cast(abortedUrlField, LifecycleStringField::class).get(reflectedHandler)
                        println("Native cancelled navigation URL: $abortedUrl")
                        check(abortedUrl?.startsWith("file:///nx-console-") == true) {
                            "Did not cancel the actual project-details HTML navigation"
                        }
                        check(!completion.getCompleted()) {
                            "Navigation completed successfully instead of being aborted"
                        }
                        check(!loaded()) { "An aborted page was marked ready" }
                        println(
                            "Actual pending HTML navigation completed: false; page ready: false"
                        )
                        cef.getJBCefClient()
                            .removeRequestHandler(checkNotNull(abortHandler), cef.getCefBrowser())
                        abortHandler = null
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
                    val callJs: (String) -> String =
                        if (
                            utility<LifecycleApplicationInfo>()
                                .getInstance()
                                .getBuild()
                                .getBaselineVersion() >= 263
                        ) {
                            val worker = new(LifecycleJsWorker::class, cef.getComponent())
                            fun(script: String) = worker.callJs(script, 5000)
                        } else {
                            val worker = new(LifecycleLegacyJsWorker::class, cef.getComponent())
                            fun(script: String) = worker.callJs(script, 5000)
                        }
                    var rendered = ""
                    val renderDeadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20)
                    while (System.nanoTime() < renderDeadline) {
                        rendered = callJs("document.body.innerText")
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
                abortHandler?.let { handler ->
                    recoveryBrowser?.let { browser ->
                        browser
                            .getJBCefClient()
                            .removeRequestHandler(handler, browser.getCefBrowser())
                    }
                }
                automationLoader?.close()
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
