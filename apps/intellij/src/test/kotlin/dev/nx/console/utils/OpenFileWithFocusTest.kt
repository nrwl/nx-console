package dev.nx.console.utils

import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class OpenFileWithFocusTest : BasePlatformTestCase() {
    fun testOpensAndSelectsTheRequestedFile() {
        val file = myFixture.configureByText("project.json", "{}").virtualFile
        val manager = FileEditorManager.getInstance(project)
        manager.closeFile(file)

        val editors = manager.openFileWithFocus(file)

        assertTrue(editors.isNotEmpty())
        assertSame(file, manager.selectedFiles.single())
        assertEquals(editors.toList(), manager.getEditors(file).toList())
    }

    fun testReusesAnExistingEditorWithoutMovingItsCaret() {
        val file =
            myFixture.configureByText("project.json", "{\n  \"name\": \"demo\"\n}").virtualFile
        val manager = FileEditorManager.getInstance(project)
        val textEditor = manager.selectedTextEditor!!
        textEditor.caretModel.moveToOffset(5)
        val opened = manager.getEditors(file).toList()

        assertEquals(opened, manager.openFileWithFocus(file).toList())
        assertSame(textEditor, manager.selectedTextEditor)
        assertEquals(5, textEditor.caretModel.offset)
    }
}
