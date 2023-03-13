package dev.nx.console.services

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import dev.nx.console.models.NxGenerator
import dev.nx.console.models.NxGeneratorContext
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nxls.NxlsWrapper
import dev.nx.console.nxls.client.NxlsLanguageClient
import dev.nx.console.nxls.server.*
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequest
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequestOptions
import dev.nx.console.nxls.server.requests.NxGetGeneratorContextFromPathRequest
import kotlinx.coroutines.future.await

private val logger = logger<NxlsService>()

class NxlsService(val project: Project) {

    companion object {
        fun getInstance(project: Project): NxlsService = project.getService(NxlsService::class.java)
    }

    var wrapper: NxlsWrapper = NxlsWrapper(project)

    private fun client(): NxlsLanguageClient? {
        return wrapper.languageClient
    }

    private fun server(): NxlsLanguageServer? {
        return wrapper.languageServer
    }

    suspend fun start() {
        wrapper.start()
    }

    fun close() {
        wrapper.stop()
    }

    suspend fun workspace(): NxWorkspace? {
        return server()?.getNxService()?.workspace()?.await()
    }

    suspend fun generators(): List<NxGenerator> {
        return server()?.getNxService()?.generators()?.await() ?: emptyList()
    }

    suspend fun generatorOptions(
        requestOptions: NxGeneratorOptionsRequestOptions
    ): List<NxGeneratorOption> {
        val request = NxGeneratorOptionsRequest(requestOptions)
        return server()?.getNxService()?.generatorOptions(request)?.await() ?: emptyList()
    }

    suspend fun generatorContextFromPath(
        generator: NxGenerator? = null,
        path: String
    ): NxGeneratorContext? {
        val request = NxGetGeneratorContextFromPathRequest(generator, path)
        return server()?.getNxService()?.generatorContextFromPath(request)?.await() ?: null
    }

    fun addDocument(editor: Editor) {
        wrapper.connect(editor)
    }

    fun removeDocument(editor: Editor) {
        wrapper.disconnect(editor)
    }

    fun changeWorkspace(workspacePath: String) {
        server()?.getNxService()?.changeWorkspace(workspacePath)
    }

    fun isEditorConnected(editor: Editor): Boolean {
        return wrapper.isEditorConnected(editor)
    }
}
