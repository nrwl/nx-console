package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.singleProject
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.isDirectory
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface FolderExclusionFileSystem {
    fun getInstance(): FolderExclusionFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

@Remote("com.intellij.openapi.roots.ProjectFileIndex")
interface FolderExclusionIndex {
    fun getInstance(project: Project): FolderExclusionIndex

    fun isExcluded(file: VirtualFile): Boolean

    fun isInContent(file: VirtualFile): Boolean
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = singleProject()
    val workspace = Path.of(project.getBasePath())
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "nx-folder-exclusion"
    val report = StringBuilder("Nx folder exclusion: $label\nworkspace: $workspace\n")
    val expected =
        mapOf(
            ".nx/cache" to true,
            ".nx/workspace-data" to true,
            "other/cache" to false,
            "other/workspace-data" to false,
        )
    recordIde(label) {
        try {
            val fileSystem = utility<FolderExclusionFileSystem>().getInstance()
            val index = utility<FolderExclusionIndex>().getInstance(project)
            for ((relativePath, excluded) in expected) {
                val path = workspace.resolve(relativePath)
                check(path.isDirectory()) { "Create $path before opening the fixture" }
                val file = checkNotNull(fileSystem.refreshAndFindFileByPath(path.toString()))
                nxlsWait(2.minutes, { "Expected excluded=$excluded for $path\n$report" }) {
                    withReadAction {
                        index.isExcluded(file) == excluded && (excluded || index.isInContent(file))
                    }
                }
                report.appendLine("$relativePath: excluded=$excluded")
            }
            report.appendLine("PASS")
        } finally {
            println(report)
            automationOutput().resolve("$label.txt").writeText(report.toString())
        }
    }
}
