package dev.nx.console.run

import junit.framework.TestCase
import kotlin.test.assertContentEquals

class NxCommandLineArgumentsTest : TestCase() {
    fun testMultipleProjectsWithConfiguration() {
        assertContentEquals(
            arrayOf(
                "run-many",
                "--targets=hello",
                "--projects=demo,util",
                "--configuration=production",
            ),
            NxRunSettings("demo,util", "hello", "production").commandLineArguments(),
        )
    }

    fun testMultipleTargetsWithConfiguration() {
        assertContentEquals(
            arrayOf(
                "run-many",
                "--targets=hello,build",
                "--projects=demo",
                "--configuration=production",
            ),
            NxRunSettings("demo", "hello,build", "production").commandLineArguments(),
        )
    }

    fun testRunManyWithoutConfiguration() {
        assertContentEquals(
            arrayOf("run-many", "--targets=hello", "--projects=demo,util"),
            NxRunSettings("demo,util", "hello").commandLineArguments(),
        )
    }

    fun testRunManyWithBlankConfiguration() {
        assertContentEquals(
            arrayOf("run-many", "--targets=hello", "--projects=demo,util"),
            NxRunSettings("demo,util", "hello", " ").commandLineArguments(),
        )
    }

    fun testSingleProjectAndTargetWithConfiguration() {
        assertContentEquals(
            arrayOf("run", "demo:hello:production"),
            NxRunSettings("demo", "hello", "production").commandLineArguments(),
        )
    }

    fun testSingleProjectAndTargetWithoutConfiguration() {
        assertContentEquals(
            arrayOf("run", "demo:hello"),
            NxRunSettings("demo", "hello").commandLineArguments(),
        )
    }
}
