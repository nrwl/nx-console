package dev.nx.console.angular

import com.intellij.testFramework.fixtures.BasePlatformTestCase

class NxAngularConfigTest : BasePlatformTestCase() {

    fun testLibraryWithoutIncludePathsUsesTheApplicationsIncludePaths() {
        val nxJson = myFixture.addFileToProject("nx.json", "{}").virtualFile
        val appStyles =
            myFixture.addFileToProject("apps/web/src/styles/_mixins.scss", "").virtualFile.parent
        val libStyles =
            myFixture.addFileToProject("libs/themed/src/styles/_theme.scss", "").virtualFile.parent

        val config =
            NxAngularConfig(
                nxJson,
                mapOf(
                    "web" to
                        projectJson(
                            "apps/web",
                            "application",
                            """"build": { "options": { "stylePreprocessorOptions": { "includePaths": ["apps/web/src/styles"] } } }""",
                        ),
                    "admin" to projectJson("apps/admin", "application"),
                    "ui" to projectJson("libs/ui", "library"),
                    "themed" to
                        projectJson(
                            "libs/themed",
                            "library",
                            """"build": { "options": { "stylePreprocessorOptions": { "includePaths": ["libs/themed/src/styles"] } } }""",
                        ),
                ),
            )
        val projects = config.projects.associateBy { it.name }

        assertEquals(listOf(appStyles), projects.getValue("web").stylePreprocessorIncludeDirs)
        assertEquals(listOf(appStyles), projects.getValue("ui").stylePreprocessorIncludeDirs)
        assertEquals(listOf(libStyles), projects.getValue("themed").stylePreprocessorIncludeDirs)
        assertEquals(emptyList<Any>(), projects.getValue("admin").stylePreprocessorIncludeDirs)
    }

    private fun projectJson(root: String, type: String, targets: String = "") =
        myFixture
            .addFileToProject(
                "$root/project.json",
                """{ "projectType": "$type", "sourceRoot": "$root/src", "targets": { $targets } }""",
            )
            .virtualFile
}
