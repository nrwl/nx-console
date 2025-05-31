package dev.nx.console.generate.ui.mocks

import com.intellij.openapi.project.Project
import dev.nx.console.models.*
import java.util.concurrent.CompletableFuture

class MockRunGeneratorManager {
    private val queuedGenerators = mutableListOf<QueuedGenerator>()

    fun queueGenerator(
        generatorString: String,
        cwd: String,
        flags: Map<String, String>,
        dryRun: Boolean
    ) {
        queuedGenerators.add(
            QueuedGenerator(
                generatorString = generatorString,
                cwd = cwd,
                flags = flags,
                dryRun = dryRun
            )
        )
    }

    fun runGenerator(
        generatorString: String,
        cwd: String,
        flags: Map<String, String>,
        dryRun: Boolean
    ) {
        // Simulate immediate run
        queueGenerator(generatorString, cwd, flags, dryRun)
    }

    fun getQueuedGenerators(): List<QueuedGenerator> = queuedGenerators.toList()

    fun clearQueue() = queuedGenerators.clear()

    data class QueuedGenerator(
        val generatorString: String,
        val cwd: String,
        val flags: Map<String, String>,
        val dryRun: Boolean
    )
}

class MockNxlsService(private val project: Project) {
    private val mockGenerators = mutableMapOf<String, NxGeneratorData>()

    init {
        // Add some default mock generators
        mockGenerators["@nx/react:app"] =
            NxGeneratorData(
                collection = "@nx/react",
                name = "app",
                description = "Create a React application",
                type = "generator",
                aliases = listOf("application")
            )

        mockGenerators["@nx/react:component"] =
            NxGeneratorData(
                collection = "@nx/react",
                name = "component",
                description = "Create a React component",
                type = "generator",
                aliases = listOf("c")
            )
    }

    fun generators(): CompletableFuture<List<NxGenerator>> {
        return CompletableFuture.completedFuture(
            mockGenerators.map { (name, data) ->
                NxGenerator(
                    name = name,
                    schemaPath = "/mock/schema/path",
                    data = data,
                    options = createMockOptions(name),
                    contextValues = null
                )
            }
        )
    }

    fun addMockGenerator(name: String, data: NxGeneratorData) {
        mockGenerators[name] = data
    }

    private fun createMockOptions(generatorName: String): List<NxGeneratorOption> {
        return when {
            generatorName.contains("app") ->
                listOf(
                    NxOptionWithNoDefault(
                        name = "name",
                        isRequired = true,
                        deprecated = false,
                        description = "Application name",
                        type = "string",
                        enum = null,
                        items = null,
                        priority = "important",
                        dropdown = null,
                        hint = null
                    ),
                    NxOptionWithStringDefault(
                        default = "css",
                        name = "style",
                        isRequired = false,
                        deprecated = false,
                        description = "Style type",
                        type = "string",
                        enum = listOf("css", "scss", "less", "styled-components"),
                        items = null,
                        priority = null,
                        dropdown = null,
                        hint = null
                    ),
                    NxOptionWithBooleanDefault(
                        default = false,
                        name = "routing",
                        isRequired = false,
                        deprecated = false,
                        description = "Add routing",
                        type = "boolean",
                        enum = null,
                        items = null,
                        priority = null,
                        dropdown = null,
                        hint = null
                    )
                )
            generatorName.contains("component") ->
                listOf(
                    NxOptionWithNoDefault(
                        name = "name",
                        isRequired = true,
                        deprecated = false,
                        description = "Component name",
                        type = "string",
                        enum = null,
                        items = null,
                        priority = "important",
                        dropdown = null,
                        hint = null
                    ),
                    NxOptionWithBooleanDefault(
                        default = false,
                        name = "export",
                        isRequired = false,
                        deprecated = false,
                        description = "Export component",
                        type = "boolean",
                        enum = null,
                        items = null,
                        priority = null,
                        dropdown = null,
                        hint = null
                    )
                )
            else -> emptyList()
        }
    }
}
