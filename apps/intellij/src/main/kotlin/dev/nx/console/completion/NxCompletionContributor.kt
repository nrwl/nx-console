package dev.nx.console.completion

import com.intellij.codeInsight.completion.*
import com.intellij.openapi.application.ex.ApplicationUtil
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.progress.ProgressIndicatorProvider
import com.intellij.patterns.PlatformPatterns.psiElement
import com.intellij.patterns.PsiElementPattern
import com.intellij.psi.PsiElement
import com.intellij.util.ProcessingContext
import dev.nx.console.nxls.managers.getDocumentManager
import dev.nx.console.utils.DocumentUtils

private val log = logger<NxCompletionContributor>()

class NxCompletionContributor : CompletionContributor() {
    init {
        extend(
            CompletionType.BASIC,
            jsonProperty(),
            object : CompletionProvider<CompletionParameters?>() {
                override fun addCompletions(
                    parameters: CompletionParameters,
                    context: ProcessingContext,
                    result: CompletionResultSet
                ) {
                    log.info("Getting completions")
                    val offset =
                        DocumentUtils.offsetToLSPPos(parameters.editor, parameters.offset)
                            ?: run {
                                log.info("Cannot get LSP positions")
                                return
                            }

                    ApplicationUtil.runWithCheckCanceled(
                        {
                            getDocumentManager(parameters.editor).apply {
                                completions(offset).let { result.addAllElements(it) }
                            }
                        },
                        ProgressIndicatorProvider.getGlobalProgressIndicator()
                    )
                }
            }
        )
    }

    private fun jsonProperty(): PsiElementPattern.Capture<PsiElement> {
        // We want to add completions for every spot
        return psiElement()
    }
}
