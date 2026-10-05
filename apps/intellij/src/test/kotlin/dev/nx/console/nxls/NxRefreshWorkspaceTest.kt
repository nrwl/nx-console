package dev.nx.console.nxls

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals

class NxRefreshWorkspaceTest : BasePlatformTestCase() {

    @OptIn(ExperimentalCoroutinesApi::class)
    fun testGraphServerRestartsOnlyAfterNxlsRefreshedTheWorkspace() = runTest {
        val calls = mutableListOf<String>()
        val workspaceRefreshed = CompletableDeferred<Unit>()

        val refresh = launch {
            refreshNxWorkspace(
                stopDaemon = { calls += "stopDaemon" },
                restartNxls = { calls += "restartNxls" },
                awaitWorkspaceRefresh = {
                    workspaceRefreshed.await()
                    calls += "workspaceRefreshed"
                },
                restartGraph = { calls += "restartGraph" },
                forcePoll = { calls += "forcePoll" },
                progress = {},
            )
        }
        advanceUntilIdle()

        assertEquals(listOf("stopDaemon", "restartNxls"), calls)

        workspaceRefreshed.complete(Unit)
        refresh.join()

        assertEquals(
            listOf("stopDaemon", "restartNxls", "workspaceRefreshed", "restartGraph", "forcePoll"),
            calls,
        )
    }

    fun testFailingToStopTheDaemonDoesNotAbortTheRefresh() = runTest {
        val calls = mutableListOf<String>()

        refreshNxWorkspace(
            stopDaemon = { throw IllegalStateException("nxls is not running") },
            restartNxls = { calls += "restartNxls" },
            awaitWorkspaceRefresh = { calls += "workspaceRefreshed" },
            restartGraph = { calls += "restartGraph" },
            forcePoll = { calls += "forcePoll" },
            progress = {},
        )

        assertEquals(
            listOf("restartNxls", "workspaceRefreshed", "restartGraph", "forcePoll"),
            calls,
        )
    }
}
