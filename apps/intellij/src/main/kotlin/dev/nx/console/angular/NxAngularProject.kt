package dev.nx.console.angular

import com.intellij.lang.Language
import com.intellij.lang.css.CSSLanguage
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import org.angular2.cli.config.AngularJsonProject
import org.angular2.cli.config.AngularLintConfiguration
import org.angular2.cli.config.AngularProject

private val LOG = Logger.getInstance("dev.nx.console.angular.NxAngularProject")

class NxAngularProject(
    override val name: String,
    private val ngProject: AngularJsonProject,
    private val workspaceFolder: VirtualFile,
    private val projectFolder: VirtualFile? = null,
    private val rspackConfigFile: VirtualFile? = null,
) : AngularProject(workspaceFolder) {

    // Cached as (modificationStamp, paths) to invalidate when the file changes.
    @Volatile private var rspackPathsCache: Pair<Long, List<String>>? = null

    private fun getRspackIncludePaths(): List<String> {
        val file = rspackConfigFile ?: return emptyList()
        return try {
            val stamp = file.modificationStamp
            rspackPathsCache?.let { if (it.first == stamp) return it.second }
            val paths = parseRspackIncludePaths(file)
            rspackPathsCache = Pair(stamp, paths)
            paths
        } catch (e: ProcessCanceledException) {
            throw e
        } catch (e: Exception) {
            LOG.debug("Failed to parse rspack include paths from ${file.path}", e)
            emptyList()
        }
    }

    override val rootDir
        get() = workspaceFolder

    override val sourceDir
        get() = ngProject.sourceRoot?.let { workspaceFolder.findFileByRelativePath(it) }

    override val cssResolveRootDir: VirtualFile
        get() = rootDir

    override val indexHtmlFile
        get() = resolveFile(ngProject.targets?.build?.options?.index)

    override val globalStyleSheets
        get() =
            ngProject.targets?.build?.options?.styles?.mapNotNull {
                rootDir.findFileByRelativePath(it)
            } ?: emptyList()

    override val stylePreprocessorIncludeDirs
        get() =
            ((ngProject.targets
                    ?.build
                    ?.options
                    ?.stylePreprocessorOptions
                    ?.includePaths
                    ?.mapNotNull { workspaceFolder.findFileByRelativePath(it) } ?: emptyList()) +
                    getRspackIncludePaths().mapNotNull { path ->
                        val normalized = path.removePrefix("./")
                        projectFolder?.findFileByRelativePath(normalized)
                            ?: workspaceFolder.findFileByRelativePath(normalized)
                    })
                .distinct()

    override val tsConfigFile: VirtualFile?
        get() = resolveFile(ngProject.targets?.build?.options?.tsConfig)

    override val karmaConfigFile
        get() = resolveFile(ngProject.targets?.test?.options?.karmaConfig)

    override val protractorConfigFile
        get() = resolveFile(ngProject.targets?.e2e?.options?.protractorConfig)

    override fun getTsLintConfigurations(project: Project): List<AngularLintConfiguration> =
        ngProject.targets?.lint?.let { lint ->
            val result = mutableListOf<AngularLintConfiguration>()
            //      lint.options?.let { result.add(AngularLintConfiguration(project, this, it)) }
            //      lint.configurations.mapTo(result) { (name, config) ->
            //        AngularLintConfiguration(project, this, config, name)
            //      }
            result
        } ?: emptyList()

    override val type: AngularProjectType?
        get() = ngProject.projectType

    override val inlineStyleLanguage: Language?
        get() {
            val text = ngProject.targets?.build?.options?.inlineStyleLanguage
            return CSSLanguage.INSTANCE.dialects.firstOrNull {
                it.id.equals(text, ignoreCase = true)
            }
        }

    @Suppress("MemberVisibilityCanBePrivate")
    override fun resolveFile(filePath: String?): VirtualFile? {
        return filePath?.let { path ->
            rootDir.takeIf { it.isValid }?.findFileByRelativePath(path)
                ?: workspaceFolder.takeIf { it.isValid }?.findFileByRelativePath(path)
        }
    }
}
