package dev.nx.console.nxls

import com.intellij.openapi.editor.Editor
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

class NxlsEditorRegistrationTest : BasePlatformTestCase() {

    private lateinit var scope: CoroutineScope
    private lateinit var service: NxlsService
    private lateinit var editor: Editor

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob())
        service = NxlsService(project, scope)
        myFixture.configureByText("nx.json", "{}")
        editor = myFixture.editor
    }

    override fun tearDown() {
        try {
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun testAnEditorIsNotConnectedBeforeItIsAdded() {
        assertFalse(
            service.isEditorConnected(editor),
            "a wrapper that was never given this editor reported it as connected",
        )
    }

    fun testConnectMakesTheEditorConnected() {
        service.addDocument(editor)

        assertTrue(
            service.isEditorConnected(editor),
            "connect() registered the editor but isEditorConnected did not see it, " +
                "so editorReleased will never disconnect the document",
        )
    }

    fun testDisconnectMakesTheEditorUnconnectedAgain() {
        service.addDocument(editor)

        service.removeDocument(editor)

        assertFalse(
            service.isEditorConnected(editor),
            "the editor stayed connected after disconnect()",
        )
    }
}
