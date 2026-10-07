package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.sdk.jdk.getSystemProperty
import java.nio.file.Path
import kotlin.io.path.listDirectoryEntries

@Remote(
    "com.jetbrains.performancePlugin.commands.TakeScreenshotCommandKt",
    plugin = "com.jetbrains.performancePlugin",
)
interface IdeWindowCapture {
    fun takeScreenshotOfAllWindowsBlocking(output: String)
}

fun main() = withAutomationDriver {
    val name = "automation-${System.currentTimeMillis()}"
    captureIdeWindows(name).forEach { println("IDE window capture: $it") }
}

fun Driver.captureIdeWindows(name: String): List<Path> {
    utility<IdeWindowCapture>().takeScreenshotOfAllWindowsBlocking(name)
    val screenshots = Path.of(getSystemProperty("idea.log.path"), "screenshots")
    val numberedName = Regex("\\d+_${Regex.escape(name)}")
    val directory =
        screenshots.listDirectoryEntries().singleOrNull {
            val directoryName = it.fileName.toString()
            directoryName == name || numberedName.matches(directoryName)
        } ?: error("The IDE did not create a screenshot directory for $name in $screenshots.")
    val captures = directory.listDirectoryEntries("*.png")
    check(captures.isNotEmpty()) { "The IDE did not capture any windows." }
    return captures
}
