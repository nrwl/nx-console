package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.isPluginLoaded
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.singleProject
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.ide.util.PropertiesComponent")
interface SourceMapPathProperties {
    fun getInstance(project: Project): SourceMapPathProperties

    fun getList(key: String): List<String>?
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface SourceMapPathFileSystem {
    fun getInstance(): SourceMapPathFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

/** The fixture needs a target using nx:run-commands and targetDefaults for that executor. */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    check(isPluginLoaded("dev.nx.console")) { "Nx Console must be loaded before this reproduction" }
    val project = singleProject()
    val properties = utility<SourceMapPathProperties>().getInstance(project)
    val evidence = Path.of(project.getBasePath(), "source-map-paths-diagnostic.txt")
    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "source-map-paths") {
        openToolWindow("Nx Console")
        invokeAction(
            "dev.nx.console.nxls.NxRefreshWorkspaceAction",
            component = ui.x("//div[@class='IdeFrameImpl']").component,
        )
        val deadline = System.nanoTime() + 30.seconds.inWholeNanoseconds
        var paths = emptyList<String>()
        val syntheticPathPrefix =
            Path.of(project.getBasePath(), "nx.json#targetDefaults.").toString()
        while (
            (paths.isEmpty() || paths.any { it.startsWith(syntheticPathPrefix) }) &&
                System.nanoTime() < deadline
        ) {
            paths = properties.getList("dev.nx.console.project_details_files").orEmpty()
            Thread.sleep(500)
        }
        val report =
            "Project details paths: actual IDE service diagnostic\n\n" +
                "IDE: ${getProductVersion()}\n" +
                "These are paths registered by ProjectConfigFilesService.\n" +
                "The Windows InvalidPathException is documented in Marketplace traces;\n" +
                "this recording checks actual path data on the current operating system.\n\n" +
                paths.joinToString("\n") {
                    Path.of(project.getBasePath()).relativize(Path.of(it)).toString()
                } +
                "\n"
        println(report)
        evidence.writeText(report)
        utility<SourceMapPathFileSystem>()
            .getInstance()
            .refreshAndFindFileByPath(evidence.toString())
        openFile(evidence.fileName.toString())
        Thread.sleep(4000)
        check(paths.isNotEmpty()) { "No project details paths were registered" }
        check(paths.none { it.startsWith(syntheticPathPrefix) }) {
            "Source-map fragments reached filesystem paths"
        }
    }
}
