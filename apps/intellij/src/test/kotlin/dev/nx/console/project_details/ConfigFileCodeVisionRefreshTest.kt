package dev.nx.console.project_details

import com.intellij.codeInsight.hints.codeVision.ModificationStampUtil
import com.intellij.openapi.editor.EditorFactory
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class ConfigFileCodeVisionRefreshTest : BasePlatformTestCase() {
    fun testRefreshInvalidatesThePassEvenWithoutPsiChanges() {
        val file = myFixture.configureByText("project.json", "{}")
        val editor = myFixture.editor
        ModificationStampUtil.putCurrentModificationStamp(editor, file)
        assertNotNull(ModificationStampUtil.getModificationStamp(editor))

        restartConfigFileCodeVision(project)

        assertNull(ModificationStampUtil.getModificationStamp(editor))
    }

    fun testRefreshDoesNotInvalidateEditorsOutsideTheProject() {
        val file = myFixture.configureByText("project.json", "{}")
        val factory = EditorFactory.getInstance()
        val editor = factory.createEditor(factory.createDocument("{}"))
        try {
            ModificationStampUtil.putCurrentModificationStamp(editor, file)
            val stamp = ModificationStampUtil.getModificationStamp(editor)

            restartConfigFileCodeVision(project)

            assertNotNull(stamp)
            assertEquals(stamp, ModificationStampUtil.getModificationStamp(editor))
        } finally {
            factory.releaseEditor(editor)
        }
    }
}
