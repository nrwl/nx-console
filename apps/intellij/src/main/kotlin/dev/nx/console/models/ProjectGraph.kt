package dev.nx.console.models

data class ProjectGraphOutput(
    val directory: String,
    val relativePath: String,
    val fullPath: String
) {}

data class CreateProjectGraphError(val code: Number, val message: String) {}
