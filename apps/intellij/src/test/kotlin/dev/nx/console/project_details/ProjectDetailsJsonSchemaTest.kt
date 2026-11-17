package dev.nx.console.project_details

import com.intellij.json.JsonFileType
import com.intellij.json.psi.JsonFile
import com.intellij.json.psi.JsonObject
import com.intellij.lang.javascript.buildTools.npm.NpmScriptsRunLineMarkerContributor
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.jetbrains.jsonSchema.impl.JsonCachedValues
import com.jetbrains.jsonSchema.impl.inspections.JsonSchemaComplianceInspection
import dev.nx.console.NxIcons

class ProjectDetailsJsonSchemaTest : BasePlatformTestCase() {
    fun testProjectJsonValidatesUnsavedChangesAgainstItsSchema() {
        myFixture.addFileToProject(
            "schema.json",
            """{"type":"object","properties":{"cache":{"type":"boolean"}}}""",
        )
        val file =
            myFixture.configureByText(
                "project.json",
                """{"${'$'}schema":"schema.json","cache":false}""",
            )
        myFixture.enableInspections(JsonSchemaComplianceInspection())
        assertEquals(
            "schema.json",
            JsonCachedValues.getSchemaUrlFromSchemaProperty(file.virtualFile, project),
        )
        assertTrue(
            myFixture.doHighlighting().none {
                it.description?.contains("Incompatible types") == true
            }
        )

        myFixture.editor.caretModel.moveToOffset(myFixture.editor.document.text.indexOf("false"))
        myFixture.editor.selectionModel.setSelection(
            myFixture.editor.caretModel.offset,
            myFixture.editor.caretModel.offset + 5,
        )
        myFixture.type("\"incorrect-type\"")

        assertTrue(
            myFixture.doHighlighting().any { it.description?.contains("Required: boolean") == true }
        )
        assertTrue(ProjectDetailsFileEditorProvider().accept(project, file.virtualFile))
    }

    fun testPackageJsonRetainsExplicitSchemaAndNpmScriptMarkers() {
        val file =
            myFixture.configureByText(
                "package.json",
                """{"${'$'}schema":"custom-package-schema.json","scripts":{"build":"node -e 0"}}""",
            )
        assertEquals(
            "custom-package-schema.json",
            JsonCachedValues.getSchemaUrlFromSchemaProperty(file.virtualFile, project),
        )
        val root = (file as JsonFile).topLevelValue as JsonObject
        val scripts = root.findProperty("scripts")!!.value as JsonObject
        val script = scripts.findProperty("build")!!
        assertNotNull(NpmScriptsRunLineMarkerContributor().getInfo(script.nameElement.firstChild))
    }

    fun testProjectDetailsFilesKeepJsonSemanticsAndNxIcon() {
        for (name in listOf("project.json", "package.json")) {
            val file = myFixture.configureByText(name, "{}")
            assertTrue(file.fileType is JsonFileType)
            assertEquals("Project Details", file.fileType.name)
            assertSame(NxIcons.FileType, file.fileType.icon)
        }
    }
}
