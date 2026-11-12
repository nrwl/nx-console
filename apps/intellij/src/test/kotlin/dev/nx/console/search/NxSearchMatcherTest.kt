package dev.nx.console.search

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class NxSearchMatcherTest {
    @Test
    fun fullProjectAndTarget() {
        assertTrue(NxSearchMatcher("my-project my-target").matchesTarget("my-project", "my-target"))
        assertFalse(NxSearchMatcher("my-project my-target").matchesTarget("other", "my-target"))
        assertFalse(NxSearchMatcher("my-project my-target").matchesTarget("my-project", "other"))
    }

    @Test
    fun partialProjectAndTarget() {
        assertTrue(NxSearchMatcher("my-proj my-targ").matchesTarget("my-project", "my-target"))
        assertTrue(NxSearchMatcher("de hel").matchesTarget("demo", "hello"))
    }

    @Test
    fun targetOnlyAcrossProjects() {
        val matcher = NxSearchMatcher("build")
        assertTrue(matcher.matchesTarget("demo", "build"))
        assertTrue(matcher.matchesTarget("util", "build"))
        assertFalse(matcher.matchesTarget("util", "hello"))
    }

    @Test
    fun projectOnlyIncludesItsTargets() {
        val matcher = NxSearchMatcher("util")
        assertTrue(matcher.matchesProject("util"))
        assertTrue(matcher.matchesTarget("util", "build"))
        assertFalse(matcher.matchesProject("demo"))
    }

    @Test
    fun colonSeparatedTarget() {
        assertTrue(NxSearchMatcher("my-proj:my-targ").matchesTarget("my-project", "my-target"))
        assertFalse(NxSearchMatcher("demo:hello").matchesProject("demo"))
    }

    @Test
    fun whitespace() {
        assertTrue(NxSearchMatcher("  de   hel  ").matchesTarget("demo", "hello"))
        assertTrue(NxSearchMatcher("de\thel").matchesTarget("demo", "hello"))
    }

    @Test
    fun emptySearchHasNoResults() {
        for (pattern in listOf("", " ", "\t")) {
            assertFalse(NxSearchMatcher(pattern).matchesProject("demo"))
            assertFalse(NxSearchMatcher(pattern).matchesTarget("demo", "hello"))
        }
    }
}
