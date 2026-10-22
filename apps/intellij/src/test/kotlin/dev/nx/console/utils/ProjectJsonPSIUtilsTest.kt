package dev.nx.console.utils

import com.intellij.json.psi.JsonProperty
import com.intellij.psi.PsiFile
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.models.NxProject
import dev.nx.console.utils.sync_services.NxProjectJsonToProjectMap

class ProjectJsonPSIUtilsTest : BasePlatformTestCase() {

    override fun tearDown() {
        try {
            NxProjectJsonToProjectMap.getInstance(project).setProjects(emptyMap())
        } finally {
            super.tearDown()
        }
    }

    private fun addProjectJson(path: String, name: String?): PsiFile =
        myFixture.addFileToProject(
            path,
            """
            {
              ${name?.let { "\"name\": \"$it\"," } ?: ""}
              "targets": {
                "build": {
                  "executor": "nx:run-commands",
                  "configurations": {
                    "production": {}
                  }
                }
              }
            }
            """
                .trimIndent(),
        )

    private fun descriptor(file: PsiFile, propertyName: String): NxTargetDescriptor? {
        val property =
            PsiTreeUtil.findChildrenOfType(file, JsonProperty::class.java).single {
                it.name == propertyName
            }
        return getNxTargetDescriptorFromNode(property, project)
    }

    private fun resolveWithNxls(file: PsiFile, projectName: String) {
        NxProjectJsonToProjectMap.getInstance(project)
            .setProjects(
                mapOf(
                    file.virtualFile.path to
                        NxProject(projectName, "packages/shop", null, null, "library", null)
                )
            )
    }

    fun testTargetConfigurationUsesProjectNameResolvedByNxls() {
        val file = addProjectJson("packages/shop/project.json", name = null)
        resolveWithNxls(file, "@fixture/shop")

        assertEquals(
            NxTargetDescriptor("@fixture/shop", "build", "production"),
            descriptor(file, "production"),
        )
        assertEquals(NxTargetDescriptor("@fixture/shop", "build"), descriptor(file, "build"))
    }

    fun testTargetConfigurationPrefersNxlsOverProjectJsonName() {
        val file = addProjectJson("packages/shop/project.json", name = "shop")
        resolveWithNxls(file, "@fixture/shop")

        assertEquals(
            NxTargetDescriptor("@fixture/shop", "build", "production"),
            descriptor(file, "production"),
        )
    }

    fun testTargetConfigurationFallsBackToProjectJsonName() {
        val file = addProjectJson("packages/named/project.json", name = "named")

        assertEquals(
            NxTargetDescriptor("named", "build", "production"),
            descriptor(file, "production"),
        )
        assertEquals(NxTargetDescriptor("named", "build"), descriptor(file, "build"))
    }

    fun testTargetConfigurationWithoutAnyProjectNameHasNoDescriptor() {
        val file = addProjectJson("packages/shop/project.json", name = null)

        assertNull(descriptor(file, "production"))
    }
}
