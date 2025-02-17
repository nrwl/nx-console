package dev.nx.console.settings_provider.options

enum class ToolWindowStyles(private val displayName: String) {
    LIST("List"),
    FOLDER("Folder"),
    AUTOMATIC("Automatic");

    override fun toString() = displayName
}
