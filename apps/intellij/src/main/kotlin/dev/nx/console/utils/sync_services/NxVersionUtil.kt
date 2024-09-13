package dev.nx.console.utils.sync_services

import com.intellij.json.psi.JsonFile
import com.intellij.json.psi.JsonObject
import com.intellij.json.psi.JsonProperty
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiManager
import com.intellij.util.text.SemVer
import dev.nx.console.models.NxVersion
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.getNxPackagePath
import dev.nx.console.utils.isDotNxInstallation
import dev.nx.console.utils.nxBasePath
import java.nio.file.Paths
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

@Service(Service.Level.PROJECT)
class NxVersionUtil(private val project: Project, private val cs: CoroutineScope) {
    private val mutex = Mutex()
    private var nxVersion: NxVersion? = null

    fun listen() {
        val nxlsService = NxlsService.getInstance(project)
        nxlsService.runAfterStarted { cs.launch { setNxVersion(nxlsService.nxVersion()) } }

        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { cs.launch { setNxVersion(nxlsService.nxVersion()) } },
            )
        }
    }

    private suspend fun setNxVersion(newVersion: NxVersion?) {
        if (nxVersion == newVersion) return
        mutex.withLock { nxVersion = newVersion }
    }

    fun getNxVersionSynchronously(): NxVersion? {
        if (ApplicationManager.getApplication().isDispatchThread) {
            return nxVersion
        } else {
            return nxVersion ?: tryGetNxVersionFromNodeModules() ?: tryGetNxVersionFromPackageJson()
        }
    }

    private fun tryGetNxVersionFromNodeModules(): NxVersion? {
        try {
            val nxPackagePath = getNxPackagePath(project, project.nxBasePath)

            val packageJsonFile =
                LocalFileSystem.getInstance()
                    .findFileByPath(Paths.get(nxPackagePath, "package.json").toString())
                    ?: return null

            val psiFile: PsiFile? = PsiManager.getInstance(project).findFile(packageJsonFile)

            if (psiFile !is JsonFile) {
                return null
            }

            val jsonObject = psiFile.topLevelValue as? JsonObject ?: return null

            val versionProperty = jsonObject.findProperty("version")

            val version = versionProperty?.let { it.value?.text } ?: return null

            return SemVer.parseFromText(version)?.let { NxVersion(it.major, it.minor, version) }
        } catch (e: Throwable) {
            return null
        }
    }

    private fun tryGetNxVersionFromPackageJson(): NxVersion? {
        try {
            val packageJsonFilePath =
                if (isDotNxInstallation(project.nxBasePath)) {
                    Paths.get(project.nxBasePath, ".nx", "installation", "node_modules", "nx")
                        .toString()
                } else {
                    Paths.get(project.nxBasePath, "package.json").toString()
                }

            val packageJsonFile: VirtualFile =
                LocalFileSystem.getInstance().findFileByPath(packageJsonFilePath) ?: return null

            if (packageJsonFile.isDirectory) {
                return null
            }

            val psiFile: PsiFile =
                PsiManager.getInstance(project).findFile(packageJsonFile) ?: return null

            if (psiFile !is JsonFile) {
                return null
            }

            val jsonObject = psiFile.topLevelValue as? JsonObject ?: return null

            val dependenciesProperty = jsonObject.findProperty("dependencies")
            val devDependenciesProperty = jsonObject.findProperty("devDependencies")

            val version =
                dependenciesProperty?.let { getDependencyVersionFromProperty(it, "nx") }
                    ?: devDependenciesProperty?.let { getDependencyVersionFromProperty(it, "nx") }
                    ?: return null

            return SemVer.parseFromText(version)?.let { NxVersion(it.major, it.minor, version) }
        } catch (e: Throwable) {
            return null
        }
    }

    private fun getDependencyVersionFromProperty(
        property: JsonProperty,
        dependencyName: String,
    ): String? {
        val dependenciesObject = property.value as? JsonObject ?: return null
        val dependencyProperty = dependenciesObject.findProperty(dependencyName)
        return dependencyProperty?.value?.text?.replace("\"", "")
    }

    companion object {
        fun getInstance(project: Project): NxVersionUtil =
            project.getService(NxVersionUtil::class.java)
    }
}
