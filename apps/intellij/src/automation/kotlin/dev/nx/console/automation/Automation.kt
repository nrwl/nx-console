package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.impl.JmxHost
import com.intellij.driver.sdk.jdk.getSystemProperty
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.time.Duration.Companion.seconds

fun withAutomationDriver(scenario: Driver.() -> Unit) {
    val port = System.getProperty("nx.console.automation.port").toInt()
    val workspace = System.getProperty("nx.console.automation.workspace")
    Driver.create(JmxHost(null, null, "127.0.0.1:$port")).use { driver ->
        val deadline = System.nanoTime() + 60.seconds.inWholeNanoseconds
        while (!runCatching { driver.isConnected }.getOrDefault(false)) {
            check(System.nanoTime() < deadline) {
                "Cannot connect to the automation IDE on port $port. Start intellij:runAutomationIde first."
            }
            Thread.sleep(500)
        }
        check(driver.getSystemProperty("nx.console.automation.workspace") == workspace) {
            "The IDE on port $port belongs to a different worktree."
        }
        driver.withContext { scenario() }
    }
}

fun automationOutput(): Path =
    Path.of(System.getProperty("nx.console.automation.output")).createDirectories()
