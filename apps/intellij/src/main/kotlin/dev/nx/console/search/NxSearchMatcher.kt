package dev.nx.console.search

import com.intellij.psi.codeStyle.NameUtil

internal class NxSearchMatcher(pattern: String) {
    private val parts = pattern.trim().split(Regex("\\s+|:"), limit = 2)
    private val empty = pattern.isBlank()
    private val nameMatcher = NameUtil.buildMatcher(parts[0]).build()
    private val targetMatcher =
        parts.getOrNull(1)?.trim()?.let { NameUtil.buildMatcher(it).build() }

    fun matchesProject(project: String): Boolean =
        !empty && targetMatcher == null && nameMatcher.matches(project)

    fun matchesTarget(project: String, target: String): Boolean =
        !empty &&
            if (targetMatcher != null) {
                nameMatcher.matches(project) && targetMatcher.matches(target)
            } else {
                nameMatcher.matches(project) || nameMatcher.matches(target)
            }
}
