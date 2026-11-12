package dev.nx.console.search

import dev.nx.console.models.NxGenerator

sealed interface NxSearchItem {
    data class Generator(val generator: NxGenerator) : NxSearchItem

    data class Project(val name: String, val root: String) : NxSearchItem

    data class Target(val project: String, val target: String) : NxSearchItem
}
