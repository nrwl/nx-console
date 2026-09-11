package dev.nx.console.generate.run_generator

import com.intellij.execution.Executor
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.process.NopProcessHandler
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.openapi.util.Disposer
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.testFramework.replaceService
import kotlin.test.assertNull
import kotlin.test.assertSame

class RunGeneratorManagerTest : BasePlatformTestCase() {

    private class RecordingRunContentManager(delegate: RunContentManager) :
        RunContentManager by delegate {
        val reused = mutableMapOf<RunContentDescriptor, RunContentDescriptor?>()
        var last: RunContentDescriptor? = null

        override fun showRunContent(
            executor: Executor,
            descriptor: RunContentDescriptor,
            contentToReuse: RunContentDescriptor?,
        ) {
            reused[descriptor] = contentToReuse
            last = descriptor
        }
    }

    private lateinit var runContentManager: RecordingRunContentManager
    private lateinit var runGeneratorManager: RunGeneratorManager

    override fun setUp() {
        super.setUp()
        runContentManager = RecordingRunContentManager(RunContentManager.getInstance(project))
        project.replaceService(RunContentManager::class.java, runContentManager, testRootDisposable)
        runGeneratorManager = RunGeneratorManager(project)
    }

    private fun show(dryRun: Boolean): RunContentDescriptor {
        val console = TextConsoleBuilderFactory.getInstance().createBuilder(project).console
        runGeneratorManager.showRunContent(console, NopProcessHandler(), dryRun)
        val descriptor = checkNotNull(runContentManager.last)
        runContentManager.last = null
        Disposer.register(testRootDisposable, descriptor)
        return descriptor
    }

    fun testEachDryRunReusesThePreviousDryRunTab() {
        val first = show(dryRun = true)
        val second = show(dryRun = true)
        val third = show(dryRun = true)

        assertNull(runContentManager.reused[first])
        assertSame(first, runContentManager.reused[second])
        assertSame(second, runContentManager.reused[third])
    }

    fun testGenerateReusesTheDryRunTab() {
        val dryRun = show(dryRun = true)
        val generate = show(dryRun = false)

        assertSame(dryRun, runContentManager.reused[generate])
    }

    fun testDryRunAfterGenerateKeepsTheGenerateTab() {
        show(dryRun = true)
        show(dryRun = false)
        val dryRun = show(dryRun = true)

        assertNull(runContentManager.reused[dryRun])
    }
}
