package dev.nx.console.automation

import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.getToolWindow
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.waitForProjectOpen
import kotlin.time.Duration.Companion.minutes

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    openToolWindow("Nx Console")
    withContext(OnDispatcher.EDT) {
        check(getToolWindow("Nx Console").isVisible()) { "Nx Console did not become visible." }
    }
    inspectIde()
}
