package dev.nx.console.angular

import com.intellij.openapi.vfs.VfsUtil
import com.intellij.openapi.vfs.VirtualFile
import java.util.*
import org.angular2.cli.config.AngularConfig
import org.angular2.cli.config.AngularProject

class NxAngularConfig(
    override val file: VirtualFile,
    val projectFiles: Map<String, VirtualFile>,
) : AngularConfig {

    override val projects: List<AngularProject> =
        projectFiles.mapNotNull { (name, file) -> getNxAngularProject(name, file) }

    override val defaultProject: AngularProject? = projects.getOrNull(0)

    override fun getProject(context: VirtualFile): AngularProject? =
        projects
            .map { Pair(it, it.proximity(context)) }
            .filter { it.second >= 0 }
            .minByOrNull { it.second }
            ?.first

    override fun toString(): String {
        return """
      | NxAngularConfig {
      |   defaultProject: ${defaultProject?.name}
      |   projects: [
      |     ${projects.joinToString(",\n     ") { it.toString() }}
      |   ]
      | }
    """
            .trimMargin()
    }

    override fun equals(other: Any?): Boolean =
        other === this ||
            other is NxAngularConfig && other.file == file && other.projectFiles == projectFiles

    override fun hashCode(): Int = Objects.hash(file, projectFiles)

    private fun AngularProject.proximity(context: VirtualFile): Int {
        val sourceDir = sourceDir ?: return -1
        if (!VfsUtil.isAncestor(sourceDir, context, false)) return -1
        return generateSequence(context) { it.parent }.takeWhile { it != sourceDir }.count()
    }
}
