package dev.nx.console.utils

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest

class ThrottlerTest : BasePlatformTestCase() {

    @OptIn(ExperimentalCoroutinesApi::class)
    fun testImmediateExecutionOnFirstCall() = runTest {
        var executionCount = 0
        val throttler = Throttler(1000, this@runTest)

        throttler.throttle { executionCount++ }
        advanceUntilIdle()

        assertEquals(1, executionCount, "First call should execute immediately")
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    fun testThrottlingBehaviorWhenCalledRapidly() = runTest {
        var executionCount = 0
        val throttler = Throttler(100, this@runTest)

        repeat(5) { throttler.throttle { executionCount++ } }
        advanceUntilIdle()

        assertEquals(1, executionCount, "Only first call should execute when called rapidly")
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    fun testThrottlerCreation() = runTest {
        Throttler(1000, this@runTest)

        assertTrue(true, "Throttler should be created successfully")
    }
}
