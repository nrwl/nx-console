package dev.nx.console.run

internal fun NxRunSettings.commandLineArguments(): Array<String> {
    val nxProjects = this.nxProjects.split(",")
    val nxTargets = this.nxTargets.split(",")
    val nxTargetsConfiguration = this.nxTargetsConfiguration
    return if (nxProjects.size > 1 || nxTargets.size > 1) {
        val array =
            arrayOf(
                "run-many",
                "--targets=${nxTargets.joinToString(separator = ",")}",
                "--projects=${nxProjects.joinToString(separator = ",")}",
            )
        if (nxTargetsConfiguration.isBlank().not()) {
            array + "--configuration=$nxTargetsConfiguration"
        } else {
            array
        }
    } else
        arrayOf(
            "run",
            "${nxProjects.first()}:${nxTargets.first()}${if(nxTargetsConfiguration.isBlank().not()) ":$nxTargetsConfiguration" else ""}",
        )
}
