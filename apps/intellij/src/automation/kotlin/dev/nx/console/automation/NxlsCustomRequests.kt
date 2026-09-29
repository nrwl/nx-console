package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.common.jcef
import com.intellij.driver.sdk.ui.components.elements.JListUiComponent
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes

@Remote("dev.nx.console.project_details.ProjectDetailsEditorWithPreview", plugin = "dev.nx.console")
interface NxlsPreviewEditor {
    fun showWithPreview()
}

@Remote("dev.nx.console.settings.NxConsoleProjectSettingsProvider", plugin = "dev.nx.console")
interface NxlsProjectSettings {
    fun getToolwindowStyle(): NxlsTreeStyle

    fun setToolwindowStyle(style: NxlsTreeStyle)
}

@Remote("dev.nx.console.settings.options.ToolWindowStyles", plugin = "dev.nx.console")
interface NxlsTreeStyle {
    fun valueOf(name: String): NxlsTreeStyle
}

@Remote("dev.nx.console.settings.options.ToolWindowStyleSetting", plugin = "dev.nx.console")
interface NxlsTreeStyleSetting {
    fun doApply()
}

internal fun Driver.nxlsWithFolderTree(project: Project, block: () -> Unit) {
    val settings = service<NxlsProjectSettings>(project)
    val original = settings.getToolwindowStyle()
    fun apply(style: NxlsTreeStyle) {
        withContext(OnDispatcher.EDT) {
            settings.setToolwindowStyle(style)
            new(NxlsTreeStyleSetting::class, project).doApply()
        }
    }
    try {
        apply(utility<NxlsTreeStyle>().valueOf("FOLDER"))
        block()
    } finally {
        apply(original)
    }
}

internal fun Driver.nxlsTree(): List<List<String>> {
    val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
    var paths = emptyList<List<String>>()
    nxlsWait(3.minutes, { "Nx project/folder tree did not populate: $paths" }) {
        tree.expandAll()
        paths = tree.collectExpandedPaths().map { it.path }
        paths.any { it.takeLast(2) == listOf("demo", "hello") } &&
            paths.any { it.takeLast(2) == listOf("libs", "util") }
    }
    check(paths.size == paths.distinct().size) { "Duplicate rendered tree paths: $paths" }
    return paths
}

private fun Driver.nxlsChooseGenerator(frame: Component, report: StringBuilder) {
    invokeAction("dev.nx.console.generate.actions.NxGenerateUiAction", component = frame)
    var selected: Pair<Component, Int>? = null
    var rows = emptyList<String>()
    nxlsWait(message = { "Generator list did not contain @fixture/notes-plugin - note: $rows" }) {
        ui.xx("//div[@class='JBList']", JListUiComponent::class.java).list().any { list ->
            rows = list.items
            val index = rows.indexOfFirst { it.startsWith("@fixture/notes-plugin - note") }
            if (index < 0) false
            else {
                selected = list.component to index
                true
            }
        }
    }
    report.appendLine("Generator popup: $rows")
    val (component, index) = checkNotNull(selected)
    withContext(OnDispatcher.EDT) {
        cast(component, DryRunGeneratorList::class).setSelectedIndex(index)
        checkNotNull(utility<DryRunPopupUtil>().getPopupContainerFor(component)).closeOk(null)
    }
}

private fun Driver.nxlsGeneratorOptions(report: StringBuilder) {
    var state = ""
    nxlsWait(message = { "Decoded generator options did not render their defaults: $state" }) {
        state =
            runCatching {
                    ui.jcef()
                        .jcefWorker
                        .callJs(
                            """(() => {
                    const name = document.getElementById('name-field');
                    const directory = document.getElementById('directory-field');
                    const enabled = document.getElementById('enabled-field');
                    const retries = document.getElementById('retries-field');
                    if (![name, directory, enabled, retries].every(e => e && e.getBoundingClientRect().height > 0))
                        return 'missing visible fields: ' + document.body.innerText;
                    return JSON.stringify({name: name.value, directory: directory.value,
                        enabled: enabled.checked, retries: retries.value});
                })()""",
                            1000,
                        )
                }
                .getOrElse { it.toString() }
        state == """{"name":"migration-note","directory":"notes","enabled":true,"retries":"3"}"""
    }
    report.appendLine("Rendered generator defaults: $state")
}

private fun Driver.nxlsProjectDetails(project: Project, report: StringBuilder) {
    openFile("demo/project.json")
    withContext(OnDispatcher.EDT) {
        checkNotNull(service<NxlsEditors>(project).getSelectedEditor()).showWithPreview()
    }
    var rendered = ""
    nxlsWait(3.minutes, { "Project details did not render demo's hello target: $rendered" }) {
        rendered =
            runCatching {
                    ui.jcef()
                        .jcefWorker
                        .callJs("document.getElementById('app')?.innerText ?? ''", 1000)
                }
                .getOrElse { it.toString() }
        Regex("\\bdemo\\b").containsMatchIn(rendered) &&
            Regex("\\bhello\\b").containsMatchIn(rendered)
    }
    report.appendLine("Project details: $rendered")
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val frame = nxlsFrame()
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "nxls-custom-requests"
    val report = StringBuilder()
    nxlsWithFolderTree(project) {
        recordIde(label) {
            try {
                nxlsRunning(project)
                openToolWindow("Nx Console")
                report.appendLine("Rendered project/folder tree: ${nxlsTree()}")
                invokeAction("CloseAllEditors", component = frame)
                nxlsChooseGenerator(frame, report)
                nxlsGeneratorOptions(report)
                // Keep the JCEF selector unambiguous when switching from Generate UI to project
                // details.
                invokeAction("CloseAllEditors", component = frame)
                nxlsProjectDetails(project, report)
            } finally {
                automationOutput()
                    .resolve("$label-${System.currentTimeMillis()}.txt")
                    .writeText(report.toString())
            }
        }
    }
}
