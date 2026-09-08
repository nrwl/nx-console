package dev.nx.console.utils

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class NoGeneratorsMessageTest {

    @Test
    fun testNamesTheActiveIncludeFilters() {
        val message = Notifier.noGeneratorsMessage(false, listOf("@nx/angular:*"))

        assertTrue(
            message.contains("@nx/angular:*"),
            "the message must name the filter that hid the generators: $message",
        )
    }

    @Test
    fun testListsEveryActiveIncludeFilter() {
        val message = Notifier.noGeneratorsMessage(false, listOf("@nx/angular:*", "@nx/react:*"))

        assertTrue(message.contains("@nx/angular:*"), message)
        assertTrue(message.contains("@nx/react:*"), message)
    }

    @Test
    fun testFilterMessageWinsOverTheNxErrorMessage() {
        val message = Notifier.noGeneratorsMessage(true, listOf("@nx/angular:*"))

        assertTrue(message.contains("@nx/angular:*"), message)
    }

    @Test
    fun testWithoutFiltersItKeepsTheNxErrorMessage() {
        assertEquals(
            "No generators found. View Nx Errors for more information.",
            Notifier.noGeneratorsMessage(true, emptyList()),
        )
    }

    @Test
    fun testWithoutFiltersOrErrorsItPointsAtTheLogs() {
        assertEquals(
            "No generators found. View logs for more information.",
            Notifier.noGeneratorsMessage(false, emptyList()),
        )
    }
}
