package dev.nx.console.completion

import com.intellij.codeInsight.completion.CompletionParameters
import com.intellij.codeInsight.completion.CompletionProvider
import com.intellij.codeInsight.completion.CompletionResultSet
import com.intellij.openapi.diagnostic.logger
import com.intellij.util.ProcessingContext
import dev.nx.console.utils.DocumentUtils


private val logger = logger<NxCompletionProvider>();

class NxCompletionProvider : CompletionProvider<CompletionParameters>() {
  override fun addCompletions(
    parameters: CompletionParameters,
    context: ProcessingContext,
    result: CompletionResultSet
  ) {
    logger.info("Getting completions");
    val offset = DocumentUtils.offsetToLSPPos(parameters.editor, parameters.offset);
    logger.info("offset: $offset")
//    TODO("Not yet implemented")

  }
}
