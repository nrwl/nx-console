package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.jdk.getSystemProperty
import com.intellij.driver.sdk.ui.components.elements.JListUiComponent
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.ide.actions.searcheverywhere.SearchEverywhereManager")
interface GeneratorSearchManager {
    fun getInstance(project: Project): GeneratorSearchManager

    fun isShown(): Boolean

    fun setSelectedTabID(id: String)

    fun getCurrentlyShownPopupInstance(): GeneratorSearchPopup
}

@Remote("com.intellij.ide.actions.searcheverywhere.SearchEverywherePopupInstance")
interface GeneratorSearchPopup {
    fun setSearchText(text: String)

    fun closePopup()
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val frame = nxlsFrame()
    nxlsRunning(project)
    val manager = utility<GeneratorSearchManager>().getInstance(project)
    val logPath = Path.of(getSystemProperty("idea.log.path"), "idea.log")
    val before = logPath.readText().length
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "generator-search"
    val report = StringBuilder("Search Everywhere generator request lifetime\n")
    recordIde(label) {
        try {
            invokeAction("SearchEverywhere", component = frame)
            nxlsWait(message = { "Search Everywhere did not open" }) { manager.isShown() }
            withContext(OnDispatcher.EDT) {
                manager.setSelectedTabID("SearchEverywhereContributor.All")
                manager.getCurrentlyShownPopupInstance().setSearchText("@fixture")
            }
            var rows = emptyList<String>()
            nxlsWait(
                30.seconds,
                { "Fixture generator never appeared in Search Everywhere: $rows" },
            ) {
                rows =
                    ui.xx("//div[@class='JBList']", JListUiComponent::class.java).list().flatMap {
                        it.items
                    }
                rows.any { it.contains("notes-plugin") && it.contains("note") }
            }
            report.appendLine("Initial query results: $rows")
            repeat(12) { index ->
                withContext(OnDispatcher.EDT) {
                    manager
                        .getCurrentlyShownPopupInstance()
                        .setSearchText(if (index % 2 == 0) "@fixture/n" else "@fixture/no")
                }
                Thread.sleep(30)
            }
            withContext(OnDispatcher.EDT) {
                manager.getCurrentlyShownPopupInstance().setSearchText("@fixture")
            }
            nxlsWait(30.seconds, { "Latest generator search did not complete: $rows" }) {
                rows =
                    ui.xx("//div[@class='JBList']", JListUiComponent::class.java).list().flatMap {
                        it.items
                    }
                rows.any { it.contains("notes-plugin") && it.contains("note") }
            }
            Thread.sleep(3000)
            report.appendLine("After rapid replacement: $rows")
            check(!logPath.readText().drop(before).contains("ClosedSendChannelException")) {
                "Search results were sent after the platform closed the request"
            }
        } catch (error: Throwable) {
            inspectIde()
            throw error
        } finally {
            automationOutput().resolve("$label-search.txt").writeText(report.toString())
            withContext(OnDispatcher.EDT) {
                if (manager.isShown()) manager.getCurrentlyShownPopupInstance().closePopup()
            }
        }
    }
}
