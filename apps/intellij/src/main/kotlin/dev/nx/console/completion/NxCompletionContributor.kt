package dev.nx.console.completion

import com.intellij.codeInsight.completion.CompletionContributor
import com.intellij.codeInsight.completion.CompletionType
import com.intellij.patterns.PlatformPatterns.psiElement
import com.intellij.patterns.PsiElementPattern
import com.intellij.psi.PsiElement
import com.intellij.json.psi.*;

class NxCompletionContributor : CompletionContributor() {
  init {
    extend(CompletionType.BASIC, jsonProperty(), NxCompletionProvider())
  }

  private fun jsonProperty(): PsiElementPattern.Capture<PsiElement> {
    // We want to add completions for every spot
    return psiElement()
  }
}
