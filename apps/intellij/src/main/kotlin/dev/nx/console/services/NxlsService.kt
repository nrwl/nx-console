package dev.nx.console.services

import com.intellij.codeInsight.lookup.LookupElement
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import dev.nx.console.lsp.NxlsWrapper
import dev.nx.console.lsp.client.NxlsLanguageClient
import dev.nx.console.lsp.server.NxlsLanguageServer
import kotlinx.coroutines.future.await
import org.eclipse.lsp4j.Position
import java.util.concurrent.CompletableFuture

class NxlsService(val project: Project) {

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


  suspend fun workspace(): Any? {
    return server()?.getNxService()?.workspace()?.await();
  }

  fun addDocument(editor: Editor) {
    wrapper.connect(editor);
  }

  fun removeDocument(editor: Editor) {
    wrapper.disconnect(editor);
  }
  
}
