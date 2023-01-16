package dev.nx.console.completion

import com.intellij.codeInsight.completion.CompletionParameters
import com.intellij.codeInsight.completion.CompletionProvider
import com.intellij.codeInsight.completion.CompletionResultSet
import com.intellij.openapi.application.ex.ApplicationUtil
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.progress.ProgressIndicatorProvider
import com.intellij.util.ProcessingContext
import dev.nx.console.lsp.managers.getOrCreateDocumentManager
import dev.nx.console.services.NxlsService
import dev.nx.console.utils.ApplicationUtils
import dev.nx.console.utils.DocumentUtils


private val log = logger<NxCompletionProvider>();

class NxCompletionProvider : CompletionProvider<CompletionParameters>() {
  override fun addCompletions(
    parameters: CompletionParameters,
    context: ProcessingContext,
    result: CompletionResultSet
  ) {
    ApplicationUtil.runWithCheckCanceled({
      log.info("Getting completions")
      val offset = DocumentUtils.offsetToLSPPos(parameters.editor, parameters.offset) ?: return@runWithCheckCanceled
      val project = parameters.editor.project ?: return@runWithCheckCanceled


      val documentManager = getOrCreateDocumentManager(parameters.editor);
      val results = documentManager.completions(offset);
      result.addAllElements(results);
    }, ProgressIndicatorProvider.getGlobalProgressIndicator())

  }
}
