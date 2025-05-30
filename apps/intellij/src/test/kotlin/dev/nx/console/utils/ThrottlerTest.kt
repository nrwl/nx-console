package dev.nx.console.utils

import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Test

class ThrottlerTest {

    @Test
    fun testImmediateExecutionOnFirstCall() = runTest {
        var executionCount = 0
        val throttler = Throttler(1000, this@runTest)

        throttler.throttle { executionCount++ }
        advanceUntilIdle()

        assertEquals(1, executionCount, "First call should execute immediately")
    }

    @Test
    fun testThrottlingBehaviorWhenCalledRapidly() = runTest {
        var executionCount = 0
        val throttler = Throttler(100, this@runTest)

        repeat(5) { throttler.throttle { executionCount++ } }
        advanceUntilIdle()

        assertEquals(1, executionCount, "Only first call should execute when called rapidly")
    }

    @Test
    fun testThrottlerCreation() {
        val scope = kotlinx.coroutines.GlobalScope
        val throttler = Throttler(1000, scope)

        assertTrue(throttler != null, "Throttler should be created successfully")
    }
}
