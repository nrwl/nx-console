package dev.nx.console.automation

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
    utility<IdeWindowCapture>().takeScreenshotOfAllWindowsBlocking(name)
    val directory = Path.of(getSystemProperty("idea.log.path"), "screenshots", name)
    val captures = directory.listDirectoryEntries("*.png")
    check(captures.isNotEmpty()) { "The IDE did not capture any windows." }
    captures.forEach { println("IDE window capture: $it") }
}
