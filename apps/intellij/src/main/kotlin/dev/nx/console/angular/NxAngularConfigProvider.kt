package dev.nx.console.angular

import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.intellij.openapi.vfs.VfsUtilCore
import com.intellij.openapi.vfs.VirtualFile
import org.angular2.cli.config.AngularConfig
import org.angular2.cli.config.AngularConfigProvider

private val NX_ANGULAR_CLI_CONFIG_KEY = Key.create<CachedAngularConfig>("NX_ANGULAR_CONFIG_KEY")

class NxAngularConfigProvider : AngularConfigProvider {

  override fun findAngularConfig(project: Project, context: VirtualFile): AngularConfig? {
    ProgressManager.checkCanceled()
    val projectJson = findFileUpHierarchy(project, context, "project.json") ?: return null
    val document = FileDocumentManager.getInstance().getCachedDocument(projectJson)
    val documentModStamp = document?.modificationStamp ?: -1
    val fileModStamp = projectJson.modificationStamp
    var cached = NX_ANGULAR_CLI_CONFIG_KEY[projectJson]
    if (cached == null
      || cached.docTimestamp != documentModStamp
      || cached.fileTimestamp != fileModStamp
    ) {
      val config = try {
        NxAngularConfig(document?.charsSequence ?: VfsUtilCore.loadText(projectJson), projectJson)
      } catch (e: ProcessCanceledException) {
        throw e
      } catch (e: Exception) {
        thisLogger().warn("Cannot load " + projectJson.name + ": " + e.message)
        null
      }
      cached = CachedAngularConfig(config, documentModStamp, fileModStamp)
      NX_ANGULAR_CLI_CONFIG_KEY[projectJson] = cached
    }
    return cached.config
  }

}

private data class CachedAngularConfig(
  val config: AngularConfig?,
  val docTimestamp: Long,
  val fileTimestamp: Long
)
