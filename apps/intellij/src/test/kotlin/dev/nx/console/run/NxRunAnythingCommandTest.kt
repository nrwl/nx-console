package dev.nx.console.run

import dev.nx.console.models.TargetInfo
import junit.framework.TestCase
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.runBlocking

class NxRunAnythingCommandTest : TestCase() {
    fun testConfigurationFromTargetString() = runBlocking {
        val command =
            checkNotNull(
                parseRunAnythingCommand(
                    listOf("child:build:production", "--message=\"hello world\"")
                ) {
                    assertEquals("child:build:production", it)
                    TargetInfo("child", "build", "production")
                }
            )
        assertEquals(TargetInfo("child", "build", "production"), command.target)
        assertEquals(
            listOf("child:build:production", "--message=\"hello world\""),
            command.arguments,
        )
    }

    fun testUsesWorkspaceParserForColonNames() = runBlocking {
        val command =
            checkNotNull(
                parseRunAnythingCommand(listOf("group:child:build:app:production")) {
                    assertEquals("group:child:build:app:production", it)
                    TargetInfo("group:child", "build:app", "production")
                }
            )
        assertEquals(TargetInfo("group:child", "build:app", "production"), command.target)
    }

    fun testConfigurationFlagsOverridePositionalAndAreRemovedFromArguments() = runBlocking {
        for (flag in
            listOf(
                listOf("--configuration=staging"),
                listOf("--configuration", "staging"),
                listOf("-c", "staging"),
                listOf("-c=staging"),
            )) {
            val command =
                checkNotNull(
                    parseRunAnythingCommand(
                        listOf("child:build:production", "--verbose") +
                            flag +
                            "--message=\"hello world\""
                    ) {
                        TargetInfo("child", "build", "production")
                    }
                )
            assertEquals(TargetInfo("child", "build", "staging"), command.target)
            assertEquals(
                listOf("child:build:production", "--verbose", "--message=\"hello world\""),
                command.arguments,
            )
        }
    }

    fun testConfigurationFlagWithoutPositionalConfiguration() = runBlocking {
        val command =
            checkNotNull(
                parseRunAnythingCommand(listOf("child:build", "-c", "production")) {
                    TargetInfo("child", "build", null)
                }
            )
        assertEquals("production", command.target.configuration)
        assertEquals(listOf("child:build"), command.arguments)
    }

    fun testDoesNotConsumeExecutorArgumentsAfterSeparator() = runBlocking {
        val args = listOf("child:build", "--", "--configuration=executor", "-c", "executor")
        val command =
            checkNotNull(parseRunAnythingCommand(args) { TargetInfo("child", "build", null) })
        assertNull(command.target.configuration)
        assertEquals(args, command.arguments)
    }

    fun testFallsBackWhenWorkspaceParserIsUnavailable() = runBlocking {
        val command =
            checkNotNull(parseRunAnythingCommand(listOf("child:build:production")) { null })
        assertEquals(TargetInfo("child", "build", "production"), command.target)
    }

    fun testEmptyOrInvalidCommand() = runBlocking {
        assertNull(parseRunAnythingCommand(emptyList()) { error("Parser should not be called") })
        assertNull(parseRunAnythingCommand(listOf("child")) { null })
    }
}
