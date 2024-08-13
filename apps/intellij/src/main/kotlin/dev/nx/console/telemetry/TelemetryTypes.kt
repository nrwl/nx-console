package dev.nx.console.telemetry

enum class TelemetryEvent(val eventName: String) {
    // Activation
    EXTENSION_ACTIVATE("extension-activate"),
    EXTENSION_DEACTIVATE("extension-deactivate"),

    // Misc
    MISC_REFRESH_WORKSPACE("misc.refresh-workspace"),
    MISC_ADD_DEPENDENCY("misc.add-dependency"),
    MISC_SHOW_PROJECT_CONFIGURATION("misc.show-project-configuration"),
    MISC_OPEN_PDV("misc.open-pdv"),
    MISC_OPEN_PROJECT_DETAILS_CODELENS("misc.open-project-details-codelens"),

    // Cloud
    CLOUD_CONNECT("cloud.connect"),
    CLOUD_OPEN_APP("cloud.open-app"),

    // Graph
    GRAPH_SHOW_ALL("graph.show-all"),
    GRAPH_SHOW_AFFECTED("graph.show-affected"),
    GRAPH_FOCUS_PROJECT("graph.focus-project"),
    GRAPH_SHOW_TASK("graph.show-task"),
    GRAPH_SELECT_PROJECT("graph.select-project"),
    GRAPH_INTERACTION_OPEN_PROJECT_EDGE_FILE("graph.interaction-open-project-edge-file"),
    GRAPH_INTERACTION_RUN_HELP("graph.interaction-run-help"),

    // Tasks
    TASKS_RUN("tasks.run"),
    TASKS_COPY_TO_CLIPBOARD("tasks.copy-to-clipboard"),
    TASKS_RUN_MANY("tasks.run-many"),

    // Generate
    GENERATE_QUICKPICK("generate.quickpick"),
    GENERATE_UI("generate.ui"),
    GENERATE_MOVE("generate.move"),
    GENERATE_REMOVE("generate.remove"),

    // CLI
    CLI_LIST("cli.list"),
    CLI_MIGRATE("cli.migrate"),
    CLI_AFFECTED("cli.affected"),
    CLI_INIT("cli.init")
}
