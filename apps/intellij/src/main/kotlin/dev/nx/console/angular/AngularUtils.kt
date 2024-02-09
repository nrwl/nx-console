package dev.nx.console.angular

import com.fasterxml.jackson.core.JsonFactory
import com.fasterxml.jackson.core.json.JsonReadFeature
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.intellij.openapi.vfs.VfsUtilCore
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.findFile
import com.intellij.util.text.CharSequenceReader
import org.angular2.cli.config.AngularJsonProject
import org.angular2.cli.config.AngularProject

fun findFileUpHierarchy(project: Project?, context: VirtualFile?, fileName: String): VirtualFile? {
    var current = context
    while (current != null) {
        if (current.isDirectory) {
            current.findFile(fileName)?.let {
                return it
            }
        }
        current = current.parent
    }
    @Suppress("DEPRECATION") return project?.baseDir?.findFile(fileName)
}

fun getNxAngularProject(name: String, projectJson: VirtualFile): AngularProject? {
    val document = FileDocumentManager.getInstance().getCachedDocument(projectJson)
    val documentModStamp = document?.modificationStamp ?: -1
    val fileModStamp = projectJson.modificationStamp
    var cached = NX_ANGULAR_PROJECT_KEY[projectJson]
    if (
        cached == null ||
            cached.docTimestamp != documentModStamp ||
            cached.fileTimestamp != fileModStamp ||
            (cached.config != null && (cached.config?.name != name))
    ) {
        val config =
            try {
                loadProjectJson(
                    name,
                    document?.charsSequence ?: VfsUtilCore.loadText(projectJson),
                    projectJson
                )
            } catch (e: ProcessCanceledException) {
                throw e
            } catch (e: Exception) {
                NxAngularConfigProvider::class
                    .java
                    .thisLogger()
                    .warn("Cannot load " + projectJson.name + ": " + e.message)
                null
            }
        cached = CachedAngularProjectConfig(config, documentModStamp, fileModStamp)
        NX_ANGULAR_PROJECT_KEY[projectJson] = cached
    }
    return cached.config
}

private fun loadProjectJson(name: String, text: CharSequence, file: VirtualFile): AngularProject {
    val projectFolder = file.parent
    val workspaceFolder = findFileUpHierarchy(null, file, "nx.json")?.parent ?: projectFolder
    val mapper =
        ObjectMapper(
                JsonFactory.builder()
                    .configure(JsonReadFeature.ALLOW_JAVA_COMMENTS, true)
                    .configure(JsonReadFeature.ALLOW_SINGLE_QUOTES, true)
                    .configure(JsonReadFeature.ALLOW_MISSING_VALUES, true)
                    .configure(JsonReadFeature.ALLOW_TRAILING_COMMA, true)
                    .configure(JsonReadFeature.ALLOW_UNQUOTED_FIELD_NAMES, true)
                    .build()
            )
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .configure(DeserializationFeature.READ_UNKNOWN_ENUM_VALUES_AS_NULL, true)
    val angularProjectJson =
        mapper.readValue(CharSequenceReader(text), AngularJsonProject::class.java)
    return NxAngularProject(name, angularProjectJson, workspaceFolder)
}

private val NX_ANGULAR_PROJECT_KEY =
    Key.create<CachedAngularProjectConfig>("NX_ANGULAR_PROJECT_KEY")

private data class CachedAngularProjectConfig(
    val config: AngularProject?,
    val docTimestamp: Long,
    val fileTimestamp: Long
)
