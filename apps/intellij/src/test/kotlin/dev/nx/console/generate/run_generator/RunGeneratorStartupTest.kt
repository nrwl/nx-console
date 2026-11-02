package dev.nx.console.generate.run_generator

import com.intellij.execution.Executor
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.SystemInfo
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.testFramework.replaceService
import com.intellij.util.ui.UIUtil
import dev.nx.console.nxls.StdinIgnoringServer
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import java.nio.file.Path
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals as assertEqual
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

class RunGeneratorStartupTest : BasePlatformTestCase() {
    private lateinit var scope: CoroutineScope
    private val descriptors = mutableListOf<RunContentDescriptor>()
    private val handlers = CopyOnWriteArrayList<KillableColoredProcessHandler>()

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        project.replaceService(
            ProjectLevelCoroutineHolderService::class.java,
            ProjectLevelCoroutineHolderService(scope),
            testRootDisposable,
        )
        val delegate = RunContentManager.getInstance(project)
        project.replaceService(
            RunContentManager::class.java,
            object : RunContentManager by delegate {
                override fun showRunContent(
                    executor: Executor,
                    descriptor: RunContentDescriptor,
                    contentToReuse: RunContentDescriptor?,
                ) {
                    assertTrue(ApplicationManager.getApplication().isDispatchThread)
                    descriptors.add(descriptor)
                    Disposer.register(testRootDisposable, descriptor)
                }
            },
            testRootDisposable,
        )
    }

    override fun tearDown() {
        try {
            scope.cancel()
            handlers.forEach {
                if (!it.isStartNotified) it.startNotify()
                it.destroyProcess()
            }
            UIUtil.dispatchAllInvocationEvents()
        } finally {
            super.tearDown()
        }
    }

    fun testProcessStartsOffEdtAndQueuedRequestKeepsItsWorkingDirectory() {
        val started = CountDownLatch(1)
        val release = CountDownLatch(1)
        val launches = CopyOnWriteArrayList<Pair<List<String>, String?>>()
        val manager =
            RunGeneratorManager(project) { definition, cwd ->
                assertFalse(
                    "Process construction must not run on the EDT",
                    ApplicationManager.getApplication().isDispatchThread,
                )
                launches.add(definition to cwd)
                if (launches.size == 1) {
                    started.countDown()
                    check(release.await(10, TimeUnit.SECONDS))
                }
                newProcess()
            }
        try {
            manager.queueGeneratorToBeRun("first", listOf("--dry-run"), "first-directory")
            assertTrue(started.await(10, TimeUnit.SECONDS))
            manager.queueGeneratorToBeRun("superseded", listOf("--dry-run"), "second-directory")
            manager.queueGeneratorToBeRun("latest", listOf("--dry-run"), "latest-directory")
        } finally {
            release.countDown()
        }
        waitUntil { descriptors.size == 2 && handlers.all { it.isProcessTerminated } }
        assertEqual(listOf("first-directory", "latest-directory"), launches.map { it.second })
        assertEqual(listOf("first", "latest"), launches.map { it.first[1] })
    }

    fun testStartupFailureDoesNotLoseTheNextRequest() {
        val started = CountDownLatch(1)
        val release = CountDownLatch(1)
        val launches = CopyOnWriteArrayList<List<String>>()
        val manager =
            RunGeneratorManager(project) { definition, _ ->
                launches.add(definition)
                if (launches.size == 1) {
                    started.countDown()
                    check(release.await(10, TimeUnit.SECONDS))
                    error("process startup failed")
                }
                newProcess()
            }
        try {
            manager.queueGeneratorToBeRun("broken", emptyList())
            assertTrue(started.await(10, TimeUnit.SECONDS))
            manager.queueGeneratorToBeRun("next", listOf("--dry-run"))
        } finally {
            release.countDown()
        }
        waitUntil { descriptors.size == 1 && handlers.all { it.isProcessTerminated } }
        assertEqual(listOf("broken", "next"), launches.map { it[1] })
    }

    fun testCancellationDuringStartupDestroysTheUnattachedProcess() {
        val started = CountDownLatch(1)
        val release = CountDownLatch(1)
        val manager =
            RunGeneratorManager(project) { _, _ ->
                newProcess(wait = true).also {
                    started.countDown()
                    check(release.await(10, TimeUnit.SECONDS))
                }
            }
        try {
            manager.queueGeneratorToBeRun("cancelled", listOf("--dry-run"))
            assertTrue(started.await(10, TimeUnit.SECONDS))
            scope.cancel()
        } finally {
            release.countDown()
        }
        waitUntil { handlers.single().isProcessTerminated }
        assertTrue(descriptors.isEmpty())
        assertFalse(handlers.single().process.isAlive)
    }

    private fun newProcess(wait: Boolean = false): KillableColoredProcessHandler {
        val java =
            Path.of(
                System.getProperty("java.home"),
                "bin",
                if (SystemInfo.isWindows) "java.exe" else "java",
            )
        val args =
            if (wait)
                listOf(
                    "-cp",
                    System.getProperty("java.class.path"),
                    StdinIgnoringServer::class.java.name,
                    "60000",
                )
            else listOf("-version")
        return KillableColoredProcessHandler(GeneralCommandLine(listOf(java.toString()) + args))
            .also { handlers.add(it) }
    }

    private fun waitUntil(condition: () -> Boolean) {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20)
        while (!condition()) {
            check(System.nanoTime() < deadline) { "Generator launch did not complete" }
            UIUtil.dispatchAllInvocationEvents()
            Thread.sleep(10)
        }
        UIUtil.dispatchAllInvocationEvents()
    }
}
