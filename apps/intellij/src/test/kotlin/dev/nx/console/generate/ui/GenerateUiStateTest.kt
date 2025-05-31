package dev.nx.console.generate.ui

import junit.framework.TestCase.*
import org.junit.Test

class GenerateUiStateTest {

    @Test
    fun `test form state tracking`() {
        val state = GenerateUiFormState()

        // Initial state
        assertTrue(state.isEmpty())
        assertFalse(state.isDirty())

        // Add field values
        state.setValue("name", "myapp")
        state.setValue("style", "css")

        assertFalse(state.isEmpty())
        assertTrue(state.isDirty())
        assertEquals("myapp", state.getValue("name"))
        assertEquals("css", state.getValue("style"))
    }

    @Test
    fun `test dry run toggle`() {
        val state = GenerateUiFormState()

        // Default is false
        assertFalse(state.isDryRun())

        state.setDryRun(true)
        assertTrue(state.isDryRun())

        state.toggleDryRun()
        assertFalse(state.isDryRun())
    }

    @Test
    fun `test flags building from form values`() {
        val state = GenerateUiFormState()
        state.setValue("name", "myapp")
        state.setValue("style", "scss")
        state.setValue("routing", true)
        state.setValue("skipTests", false)
        state.setValue("tags", listOf("feature", "ui"))

        val flags = state.buildFlags()

        assertTrue(flags.contains("--name=myapp"))
        assertTrue(flags.contains("--style=scss"))
        assertTrue(flags.contains("--routing"))
        assertFalse(flags.contains("--skipTests")) // false boolean values are omitted
        assertTrue(flags.contains("--tags=feature,ui"))
    }

    @Test
    fun `test form validation`() {
        val state = GenerateUiFormState()
        val requiredFields = listOf("name", "project")

        // Initially invalid (missing required fields)
        assertFalse(state.isValid(requiredFields))

        // Add one required field
        state.setValue("name", "myapp")
        assertFalse(state.isValid(requiredFields)) // Still missing "project"

        // Add all required fields
        state.setValue("project", "apps/myapp")
        assertTrue(state.isValid(requiredFields))

        // Empty value should make it invalid
        state.setValue("name", "")
        assertFalse(state.isValid(requiredFields))
    }

    @Test
    fun `test state reset`() {
        val state = GenerateUiFormState()
        state.setValue("name", "myapp")
        state.setValue("style", "css")
        state.setDryRun(true)

        assertTrue(state.isDirty())
        assertFalse(state.isEmpty())

        state.reset()

        assertTrue(state.isEmpty())
        assertFalse(state.isDirty())
        assertFalse(state.isDryRun())
    }

    @Test
    fun `test command building`() {
        val state = GenerateUiFormState()
        state.setValue("name", "myapp")
        state.setValue("style", "scss")

        val command = state.buildCommand("@nx/react:app", "apps/myapp")

        assertEquals("nx g @nx/react:app apps/myapp --name=myapp --style=scss", command)

        // Test with dry run
        state.setDryRun(true)
        val dryRunCommand = state.buildCommand("@nx/react:app", "apps/myapp")

        assertEquals(
            "nx g @nx/react:app apps/myapp --name=myapp --style=scss --dry-run",
            dryRunCommand
        )
    }

    @Test
    fun `test array value handling`() {
        val state = GenerateUiFormState()
        state.setValue("tags", listOf("feature", "ui", "shared"))

        val flags = state.buildFlags()
        assertTrue(flags.contains("--tags=feature,ui,shared"))

        // Empty array should be omitted
        state.setValue("tags", emptyList<String>())
        val flagsWithEmptyArray = state.buildFlags()
        assertFalse(flagsWithEmptyArray.any { it.contains("tags") })
    }

    @Test
    fun `test special flag values`() {
        val state = GenerateUiFormState()

        // Null values should be omitted
        state.setValue("nullField", null)

        // Boolean true becomes flag without value
        state.setValue("verbose", true)

        // String with spaces should be quoted
        state.setValue("description", "My awesome app")

        val flags = state.buildFlags()

        assertFalse(flags.any { it.contains("nullField") })
        assertTrue(flags.contains("--verbose"))
        assertTrue(flags.contains("--description=\"My awesome app\""))
    }

    @Test
    fun `test state persistence`() {
        val state = GenerateUiFormState()
        state.setValue("name", "myapp")
        state.setValue("style", "css")

        val snapshot = state.toMap()

        val newState = GenerateUiFormState()
        newState.fromMap(snapshot)

        assertEquals("myapp", newState.getValue("name"))
        assertEquals("css", newState.getValue("style"))
    }
}

// Implementation class for testing
private class GenerateUiFormState {
    private val values = mutableMapOf<String, Any?>()
    private var dryRun = false
    private var dirty = false

    fun setValue(field: String, value: Any?) {
        values[field] = value
        dirty = true
    }

    fun getValue(field: String): Any? = values[field]

    fun isEmpty(): Boolean = values.isEmpty()

    fun isDirty(): Boolean = dirty

    fun isDryRun(): Boolean = dryRun

    fun setDryRun(value: Boolean) {
        dryRun = value
    }

    fun toggleDryRun() {
        dryRun = !dryRun
    }

    fun reset() {
        values.clear()
        dryRun = false
        dirty = false
    }

    fun isValid(requiredFields: List<String>): Boolean {
        return requiredFields.all { field ->
            val value = values[field]
            value != null && value.toString().isNotEmpty()
        }
    }

    fun buildFlags(): List<String> {
        return values.mapNotNull { (key, value) ->
            when {
                value == null -> null
                value is Boolean -> if (value) "--$key" else null
                value is List<*> -> {
                    if (value.isEmpty()) null else "--$key=${value.joinToString(",")}"
                }
                value.toString().contains(" ") -> "--$key=\"$value\""
                else -> "--$key=$value"
            }
        }
    }

    fun buildCommand(generator: String, positional: String): String {
        val flags = buildFlags()
        val allArgs =
            listOf("nx", "g", generator, positional) +
                flags +
                if (dryRun) listOf("--dry-run") else emptyList()
        return allArgs.joinToString(" ")
    }

    fun toMap(): Map<String, Any?> = values.toMap()

    fun fromMap(map: Map<String, Any?>) {
        values.clear()
        values.putAll(map)
    }
}
