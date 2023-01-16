package dev.nx.console.languageServer.listeners;

import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener as IntellijDocumentListener

class DocumentListener : IntellijDocumentListener {

  override fun documentChanged(event: DocumentEvent) {
    super.documentChanged(event)
  }
}
