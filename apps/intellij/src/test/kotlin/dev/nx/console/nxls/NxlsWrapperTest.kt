package dev.nx.console.nxls

import com.intellij.openapi.editor.Editor
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.nxls.managers.DocumentManager
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

class NxlsWrapperTest : BasePlatformTestCase() {

    private lateinit var scope: CoroutineScope
    private lateinit var wrapper: NxlsWrapper
    private lateinit var editor: Editor

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob())
        wrapper = NxlsWrapper(project, scope)
        myFixture.configureByText("nx.json", "{}")
        editor = myFixture.editor
    }

    override fun tearDown() {
        try {
            DocumentManager.getInstance(editor).documentClosed()
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun testAnEditorIsNotConnectedBeforeItIsAdded() {
        assertFalse(
            wrapper.isEditorConnected(editor),
            "a wrapper that was never given this editor reported it as connected",
        )
    }

    fun testConnectMakesTheEditorConnected() {
        wrapper.connect(editor)

        assertTrue(
            wrapper.isEditorConnected(editor),
            "connect() registered the editor but isEditorConnected did not see it, " +
                "so editorReleased will never disconnect the document",
        )
    }

    fun testDisconnectMakesTheEditorUnconnectedAgain() {
        wrapper.connect(editor)

        wrapper.disconnect(editor)

        assertFalse(
            wrapper.isEditorConnected(editor),
            "the editor stayed connected after disconnect()",
        )
    }
}
