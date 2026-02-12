package dev.nx.console.telemetry

import com.intellij.openapi.diagnostic.thisLogger
import kotlin.reflect.full.companionObject

// these are compared to libs/shared/telemetry/src/lib/telemetry-types.ts
// through the @nx-console/workspace:telemetry-check target
// keep them in sync with VSCode!
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
    MISC_EXCEPTION("misc.exception"),
    MISC_VSCODE_DOCUMENT_URI_ERROR("misc.vscode-document-uri-error"),
    MISC_SET_NO_DELAY_ERROR("misc.set-no-delay-error"),
    MISC_NX_LATEST_NO_PROVENANCE("misc.nx-latest-no-provenance"),

    // Migrate
    MIGRATE_OPEN("migrate.open"),
    MIGRATE_START("migrate.start"),

    // AI
    AI_ADD_MCP("ai.add-mcp"),
    AI_CHAT_MESSAGE("ai.chat-message"),
    AI_FEEDBACK_BAD("ai.feedback-bad"),
    AI_FEEDBACK_GOOD("ai.feedback-good"),
    AI_RESPONSE_INTERACTION("ai.response-interaction"),
    AI_TOOL_CALL("ai.tool-call"),
    AI_RESOURCE_READ("ai.resource-read"),
    AI_CONFIGURE_AGENTS_CHECK_NOTIFICATION("ai.configure-agents-check-notification"),
    AI_CONFIGURE_AGENTS_ACTION("ai.configure-agents-action"),
    AI_CONFIGURE_AGENTS_DONT_ASK_AGAIN("ai.configure-agents-dont-ask-again"),
    AI_CONFIGURE_AGENTS_SETUP_NOTIFICATION("ai.configure-agents-setup-notification"),
    AI_CONFIGURE_AGENTS_SETUP_ACTION("ai.configure-agents-setup-action"),
    AI_CONFIGURE_AGENTS_LEARN_MORE("ai.configure-agents-learn-more"),

    // Cloud
    CLOUD_CONNECT("cloud.connect"),
    CLOUD_OPEN_APP("cloud.open-app"),
    CLOUD_GENERATE_CI_WORKFLOW("cloud.generate-ci-workflow"),
    CLOUD_FINISH_SETUP("cloud.finish-setup"),
    CLOUD_SHOW_AFFECTED_DOCS("cloud.show-affected-docs"),
    CLOUD_SHOW_CIPE_NOTIFICATION("cloud.show-cipe-notification"),
    CLOUD_VIEW_CIPE("cloud.view-cipe"),
    CLOUD_VIEW_CIPE_COMMIT("cloud.view-cipe-commit"),
    CLOUD_APPLY_AI_FIX("cloud.apply-ai-fix"),
    CLOUD_APPLY_AI_FIX_LOCALLY("cloud.apply-ai-fix-locally"),
    CLOUD_OPEN_FIX_DETAILS("cloud.open-fix-details"),
    CLOUD_REJECT_AI_FIX("cloud.reject-ai-fix"),
    CLOUD_RERUN_CI("cloud.rerun-ci"),
    CLOUD_SHOW_AI_FIX("cloud.show-ai-fix"),
    CLOUD_SHOW_AI_FIX_NOTIFICATION("cloud.show-ai-fix-notification"),
    CLOUD_VIEW_RUN("cloud.view-run"),
    CLOUD_REFRESH_VIEW("cloud.refresh-view"),

    // Graph
    GRAPH_SHOW_ALL("graph.show-all"),
    GRAPH_SHOW_AFFECTED("graph.show-affected"),
    GRAPH_FOCUS_PROJECT("graph.focus-project"),
    GRAPH_SHOW_TASK("graph.show-task"),
    GRAPH_SHOW_TASK_GROUP("graph.show-task-group"),
    GRAPH_SELECT_PROJECT("graph.select-project"),
    GRAPH_INTERACTION_OPEN_PROJECT_EDGE_FILE("graph.interaction-open-project-edge-file"),
    GRAPH_INTERACTION_RUN_HELP("graph.interaction-run-help"),

    // Tasks
    TASKS_RUN("tasks.run"),
    TASK_INIT("task.init"),
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
    CLI_INIT("cli.init"),
}

class TelemetryEventSource(val source: String) {
    companion object {
        val COMMAND = "command"
        val PROJECTS_VIEW = "projects-view"
        val EXPLORER_CONTEXT_MENU = "explorer-context-menu"
        val GRAPH_INTERACTION = "graph-interaction"
        val PDV_INTERACTION = "pdv-interaction"
        val CODELENS = "codelens"
        val NX_COMMANDS_PANEL = "nx-commands-panel"
        val WELCOME_VIEW = "welcome-view"
        val MIGRATE_ANGULAR_PROMPT = "migrate-angular-prompt"
        val EDITOR_TOOLBAR = "editor-toolbar"
        val NOTIFICATION = "notification"
        val CLOUD_VIEW = "cloud-view"

        // Function to get all sources using reflection
        private fun getAllSources(): List<String> {
            return this::class
                .companionObject
                ?.members
                ?.filterIsInstance<kotlin.reflect.KProperty1<Companion, String>>()
                ?.map { it.get(this) } ?: emptyList()
        }

        // Function to validate if a string is a valid source
        fun isValidSource(source: String): Boolean {
            thisLogger().debug("Checking if $source is a valid source")
            thisLogger().debug("Valid sources: ${getAllSources()}")
            val validSources = getAllSources()
            return source in validSources
        }
    }
}
