package dev.nx.console.nxls

import com.intellij.concurrency.resetThreadContext
import com.intellij.execution.ExecutionException
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.assertNull

/**
 * The platform starts the server process from a pooled thread whose context it has explicitly
 * reset, so there is no job to attach to. Building the command line must not need one.
 */
class NxlsCommandLineContextTest : BasePlatformTestCase() {

    fun testCommandLineIsBuiltWithoutAProgressContext() {
        val harness =
            PlatformLspTestHarness(project, myFixture.tempDirFixture.findOrCreateDir("ws"))
        val descriptor = harness.start().descriptor
        val executor = Executors.newSingleThreadExecutor()
        try {
            val failure =
                executor
                    .submit<Throwable?> {
                        resetThreadContext {
                            try {
                                descriptor.createCommandLine()
                                null
                            } catch (e: ExecutionException) {
                                // Nxls is absent in tests; only the threading contract matters.
                                null
                            } catch (e: Throwable) {
                                e
                            }
                        }
                    }
                    .get(30, TimeUnit.SECONDS)

            assertNull(failure, "Building the command line required a progress context")
        } finally {
            executor.shutdownNow()
            harness.session.dispose()
        }
    }
}
