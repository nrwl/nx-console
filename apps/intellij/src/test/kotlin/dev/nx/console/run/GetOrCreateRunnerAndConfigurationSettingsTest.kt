package dev.nx.console.run

import com.intellij.execution.RunManager
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlin.test.assertEquals

class GetOrCreateRunnerAndConfigurationSettingsTest : BasePlatformTestCase() {

    fun testCreatesNewConfigurationWithArguments() {
        val settings =
            getOrCreateRunnerConfigurationSettings(
                project,
                "myapp",
                "build",
                "",
                listOf("myapp:build", "--prod", "--verbose"),
            )

        val config = settings.configuration as NxCommandConfiguration
        assertEquals("myapp", config.nxRunSettings.nxProjects)
        assertEquals("build", config.nxRunSettings.nxTargets)
        assertEquals("--prod --verbose", config.nxRunSettings.arguments)
    }

    fun testCreatesNewConfigurationWithoutArguments() {
        val settings = getOrCreateRunnerConfigurationSettings(project, "myapp", "build")

        val config = settings.configuration as NxCommandConfiguration
        assertEquals("myapp", config.nxRunSettings.nxProjects)
        assertEquals("build", config.nxRunSettings.nxTargets)
        assertEquals("", config.nxRunSettings.arguments)
    }

    fun testReusesExistingConfigurationAndUpdatesArguments() {
        val runManager = RunManager.getInstance(project)

        val first =
            getOrCreateRunnerConfigurationSettings(
                project,
                "myapp",
                "build",
                "",
                listOf("myapp:build"),
            )
        runManager.addConfiguration(first)

        val second =
            getOrCreateRunnerConfigurationSettings(
                project,
                "myapp",
                "build",
                "",
                listOf("myapp:build", "--prod", "--configuration=production"),
            )

        assertEquals(
            first.configuration,
            second.configuration,
            "Should reuse the same configuration",
        )

        val config = second.configuration as NxCommandConfiguration
        assertEquals("--prod --configuration=production", config.nxRunSettings.arguments)
    }

    fun testReusesExistingConfigurationAndClearsArguments() {
        val runManager = RunManager.getInstance(project)

        val first =
            getOrCreateRunnerConfigurationSettings(
                project,
                "myapp",
                "build",
                "",
                listOf("myapp:build", "--prod"),
            )
        runManager.addConfiguration(first)

        val second = getOrCreateRunnerConfigurationSettings(project, "myapp", "build")

        assertEquals(
            first.configuration,
            second.configuration,
            "Should reuse the same configuration",
        )

        val config = second.configuration as NxCommandConfiguration
        assertEquals("", config.nxRunSettings.arguments)
    }

    fun testDifferentTargetConfigurationsAreNotReused() {
        val runManager = RunManager.getInstance(project)

        val first = getOrCreateRunnerConfigurationSettings(project, "myapp", "build", "production")
        runManager.addConfiguration(first)

        val second =
            getOrCreateRunnerConfigurationSettings(project, "myapp", "build", "development")

        assertNotSame(
            "Different target configurations should create separate configurations",
            first.configuration,
            second.configuration,
        )
    }
}
