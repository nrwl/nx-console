package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.service
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.getPlugin
import com.intellij.driver.sdk.ui.remote.SwingHierarchyService
import kotlin.io.path.writeText

fun main() = withAutomationDriver { inspectIde() }

fun Driver.inspectIde() {
    val plugin = getPlugin("dev.nx.console")

    val output = automationOutput()
    val hierarchy = service<SwingHierarchyService>().getSwingHierarchyAsDOM(null, false)
    check(hierarchy.contains("javaclass=")) { "The IDE returned an empty UI hierarchy." }
    output.resolve("ui.html").writeText(hierarchy)

    val report = buildString {
        appendLine("IDE: ${getProductVersion()}")
        appendLine("Plugin: ${plugin?.getName()} (enabled: ${plugin?.isEnabled()})")
        getOpenProjects().forEach { appendLine("Project: ${it.getName()}") }
        appendLine("UI hierarchy: ${output.resolve("ui.html")}")
    }
    output.resolve("inspection.txt").writeText(report)
    println(report)
    check(plugin != null && plugin.isEnabled()) {
        "Nx Console is not enabled in the automation IDE."
    }
}
