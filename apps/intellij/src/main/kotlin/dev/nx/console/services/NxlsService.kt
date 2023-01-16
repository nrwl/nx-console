package dev.nx.console.services

import com.intellij.openapi.project.Project
import dev.nx.console.lsp.NxlsWrapper
import kotlinx.coroutines.future.await

class NxlsService(val project: Project) {

  var wrapper: NxlsWrapper = NxlsWrapper(project)


  suspend fun start() {
    wrapper.start()
  }


  fun close() {
    wrapper.stop()
  }


  suspend fun workspace(): Any? {
    return wrapper.languageServer?.getNxService()?.workspace()?.await();
  }
}
