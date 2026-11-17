package dev.nx.console.run

import dev.nx.console.models.TargetInfo

internal data class NxRunAnythingCommand(val target: TargetInfo, val arguments: List<String>)

internal suspend fun parseRunAnythingCommand(
    arguments: List<String>,
    parseTarget: suspend (String) -> TargetInfo?,
): NxRunAnythingCommand? {
    val task = arguments.firstOrNull() ?: return null
    val target =
        parseTarget(task)
            ?: task.split(":", limit = 3).let {
                if (it.size < 2) return null
                TargetInfo(it[0], it[1], it.getOrNull(2))
            }
    var configuration = target.configuration
    val remaining = mutableListOf(task)
    var index = 1
    while (index < arguments.size) {
        val argument = arguments[index]
        when {
            argument == "--" -> {
                remaining.addAll(arguments.drop(index))
                break
            }
            argument.startsWith("--configuration=") || argument.startsWith("-c=") ->
                configuration = argument.substringAfter('=')
            (argument == "--configuration" || argument == "-c") &&
                index + 1 < arguments.size &&
                !arguments[index + 1].startsWith("-") -> {
                configuration = arguments[++index]
            }
            else -> remaining.add(argument)
        }
        index++
    }
    return NxRunAnythingCommand(target.copy(configuration = configuration), remaining)
}
