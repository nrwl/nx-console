package dev.nx.console.cli

import com.intellij.execution.filters.Filter
import com.intellij.javascript.nodejs.packages.NodePackageUtil
import com.intellij.lang.javascript.boilerplate.NpmPackageProjectGenerator
import com.intellij.lang.javascript.boilerplate.NpxPackageDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ContentEntry
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.util.PathUtil
import dev.nx.console.NxConsoleBundle
import dev.nx.console.NxIcons
import javax.swing.Icon

class NxCreateWorkspaceProjectGenerator : NpmPackageProjectGenerator() {

    private val PACKAGE_NAME = "create-nx-workspace"
    private val CREATE_COMMAND = "create-nx-workspace"

    override fun getId(): String = "Nx"

    override fun getName(): String = NxConsoleBundle.message("create.nx.workspace.name")

    override fun generatorArgs(project: Project, baseDir: VirtualFile): Array<String> =
        arrayOf(baseDir.name)

    override fun generateInTemp(): Boolean = true

    override fun getDescription(): String =
        NxConsoleBundle.message("create.nx.workspace.description")

    override fun filters(project: Project, baseDir: VirtualFile): Array<Filter> = Filter.EMPTY_ARRAY

    override fun customizeModule(baseDir: VirtualFile, entry: ContentEntry) {
        // exclude some folders ?
    }

    override fun getNpxCommands(): List<NpxPackageDescriptor.NpxCommand> {
        return listOf(NpxPackageDescriptor.NpxCommand(PACKAGE_NAME, CREATE_COMMAND))
    }
    override fun packageName(): String = PACKAGE_NAME

    override fun presentablePackageName(): String = "create-nx-&workspace:"

    override fun getIcon(): Icon = NxIcons.Action

    override fun validateProjectPath(path: String): String? {
        val error = NodePackageUtil.validateNpmPackageName(PathUtil.getFileName(path))
        return error ?: super.validateProjectPath(path)
    }
}
