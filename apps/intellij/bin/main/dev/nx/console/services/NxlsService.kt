package dev.nx.console.services

import com.intellij.openapi.project.Project
import dev.nx.console.languageServer.NxlsLanguageServerWrapper

class NxlsService(val project: Project) {

  var server: NxlsLanguageServerWrapper = NxlsLanguageServerWrapper(project);


  suspend fun start() {
    server.start()
  }


  fun close() {
    server.stop();
  }
}
