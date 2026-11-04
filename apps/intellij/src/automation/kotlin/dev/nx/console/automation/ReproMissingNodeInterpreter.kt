package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.jdk.getSystemProperty
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.singleProject
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote(
    "com.intellij.javascript.nodejs.interpreter.NodeJsInterpreterManager",
    plugin = "JavaScript",
)
interface MissingNodeInterpreterManager {
    fun getInstance(project: Project): MissingNodeInterpreterManager

    fun getInterpreterRef(): MissingNodeInterpreterRef

    fun setInterpreterRef(ref: MissingNodeInterpreterRef)

    fun isInterpreterAvailable(): Boolean
}

@Remote("com.intellij.javascript.nodejs.interpreter.NodeJsInterpreterRef", plugin = "JavaScript")
interface MissingNodeInterpreterRef {
    fun create(referenceName: String): MissingNodeInterpreterRef

    fun getReferenceName(): String
}

@Remote("com.intellij.diagnostic.MessagePool")
interface MissingNodeMessagePool {
    fun getInstance(): MissingNodeMessagePool

    fun getFatalErrors(
        includeReadMessages: Boolean,
        includeSubmittedMessages: Boolean,
    ): List<MissingNodeMessage>
}

@Remote("com.intellij.diagnostic.AbstractMessage")
interface MissingNodeMessage {
    fun getThrowableText(): String
}

/**
 * Removes the project's Node.js interpreter and configures it again, the way a user does from the
 * Node.js settings that Nx Console's "Configure Node interpreter" button opens. Checks that Nx
 * Console shows the missing interpreter without a manual refresh, that Refresh Nx Workspace reports
 * it at once, that Nx Console recovers when the interpreter is configured again, and that none of
 * this raises IDE errors.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = singleProject()
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "missing-node-interpreter"
    val log = Path.of(getSystemProperty("idea.log.path"), "idea.log")
    val report = StringBuilder("Nx Console with no Node.js interpreter configured\n")
    val manager = utility<MissingNodeInterpreterManager>().getInstance(project)
    val original = manager.getInterpreterRef().getReferenceName()
    report.appendLine("Configured interpreter before the scenario: $original")
    nxlsFrame()
    nxlsRunning(project)
    val results = mutableListOf<Boolean>()
    fun result(name: String, passed: Boolean) {
        results += passed
        report.appendLine("$name: ${if (passed) "PASS" else "FAIL"}")
    }
    fun waitFor(timeoutSeconds: Int, condition: () -> Boolean): Boolean =
        runCatching {
                nxlsWait(timeoutSeconds.seconds, { "timed out" }) {
                    runCatching(condition).getOrDefault(false)
                }
            }
            .isSuccess
    val noInterpreterPanel =
        ui.x("//div[@class='JLabel' and contains(@text, 'Nx Console needs this setting')]")
    val noInterpreterNotification =
        ui.x("//div[contains(@visible_text, 'Local or WSL Node.js interpreter not configured')]")
    var restored = false
    recordIde(label) {
        try {
            openToolWindow("Nx Console")
            check(waitFor(60) { demoListed() }) { "Nx Console did not list demo before the test" }
            Thread.sleep(2000)
            val errorsBefore = nxConsoleFatalErrors().size
            val logOffset = log.readText().length

            withContext(OnDispatcher.EDT) {
                manager.setInterpreterRef(
                    utility<MissingNodeInterpreterRef>().create("missing-node-interpreter")
                )
            }
            check(!manager.isInterpreterAvailable()) {
                "The IDE still resolves a Node.js interpreter; the scenario cannot remove it"
            }
            report.appendLine(
                "Interpreter removed: ${manager.getInterpreterRef().getReferenceName()} " +
                    "(available: ${manager.isInterpreterAvailable()})"
            )
            result(
                "1. Tool window shows the missing interpreter within 30s, without a refresh",
                waitFor(30) { noInterpreterPanel.present() },
            )
            Thread.sleep(2000)

            invokeAction("dev.nx.console.nxls.NxRefreshWorkspaceAction", component = nxlsFrame())
            result(
                "2. Refresh Nx Workspace reports the missing interpreter within 15s",
                waitFor(15) { noInterpreterNotification.present() },
            )
            Thread.sleep(2000)
            nxlsFrame()

            withContext(OnDispatcher.EDT) {
                manager.setInterpreterRef(utility<MissingNodeInterpreterRef>().create(original))
            }
            restored = true
            report.appendLine(
                "Interpreter configured again: ${manager.getInterpreterRef().getReferenceName()} " +
                    "(available: ${manager.isInterpreterAvailable()})"
            )
            result(
                "3. Nx Console restarts nxls and lists demo again within 90s, without a refresh",
                waitFor(90) {
                    service<EditorFreezeNxlsService>(project).isStarted() &&
                        !noInterpreterPanel.present() &&
                        demoListed()
                },
            )
            Thread.sleep(3000)

            val newErrors = nxConsoleFatalErrors().drop(errorsBefore)
            val logErrors =
                log.readText()
                    .drop(logOffset)
                    .split(Regex("(?m)^(?=[0-9]{4}-[0-9]{2}-[0-9]{2} )"))
                    .filter { it.contains(" ERROR - ") && it.contains(INTERPRETER_MESSAGE) }
            result(
                "4. No IDE fatal errors or idea.log ERROR entries about the interpreter " +
                    "(${newErrors.size} fatal, ${logErrors.size} logged)",
                newErrors.isEmpty() && logErrors.isEmpty(),
            )
            (newErrors + logErrors).forEach { error ->
                error.lineSequence().take(12).forEach { report.appendLine("    $it") }
            }

            check(results.all { it }) { "Nx Console mishandled the missing interpreter\n$report" }
            report.appendLine("PASS")
        } finally {
            if (!restored) {
                withContext(OnDispatcher.EDT) {
                    manager.setInterpreterRef(utility<MissingNodeInterpreterRef>().create(original))
                }
            }
            automationOutput().resolve("$label.txt").writeText(report.toString())
            println(report)
        }
    }
}

private fun Driver.demoListed(): Boolean {
    val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
    if (!tree.present()) return false
    runCatching { tree.expandAll() }
    val swingTree = cast(tree.component, ShortcutSwingTree::class)
    return withContext(OnDispatcher.EDT) {
        (0 until swingTree.getRowCount()).any { index ->
            swingTree.getPathForRow(index)?.getLastPathComponent()?.toString() == "demo"
        }
    }
}

private const val INTERPRETER_MESSAGE = "Node.js interpreter not configured"

private fun Driver.nxConsoleFatalErrors(): List<String> =
    utility<MissingNodeMessagePool>()
        .getInstance()
        .getFatalErrors(true, true)
        .map { it.getThrowableText() }
        .filter { it.contains(INTERPRETER_MESSAGE) }
