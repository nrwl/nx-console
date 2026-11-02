package dev.nx.console.listeners

import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.project.Project
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.nxls.NxlsService
import java.lang.reflect.Proxy
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

class NxEditorListenerTest : BasePlatformTestCase() {
    private lateinit var scope: CoroutineScope
    private lateinit var service: NxlsService
    private var disposed = false
    private var existingService: NxlsService? = null
    private var serviceLookups = 0

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob())
        service = NxlsService(project, scope)
        myFixture.configureByText("notes.txt", "editor cleanup")
    }

    override fun tearDown() {
        try {
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun testReleaseDoesNotCreateTheLanguageServerService() {
        releaseEditor()
        assertEquals(1, serviceLookups)
    }

    fun testReleaseDisconnectsAnEditorFromAnExistingService() {
        existingService = service
        service.addDocument(myFixture.editor)

        releaseEditor()

        assertFalse(service.isEditorConnected(myFixture.editor))
    }

    fun testReleaseSkipsTheDisposedProjectContainer() {
        disposed = true
        existingService = service
        service.addDocument(myFixture.editor)

        releaseEditor()

        assertEquals(0, serviceLookups)
        assertTrue(service.isEditorConnected(myFixture.editor))
    }

    fun testDisposalDuringLookupDoesNotCreateServices() {
        existingService = null
        releaseEditor(disposeDuringLookup = true)
        assertTrue(disposed)
        assertEquals(1, serviceLookups)
    }

    private fun releaseEditor(disposeDuringLookup: Boolean = false) {
        val editorProject =
            Proxy.newProxyInstance(Project::class.java.classLoader, arrayOf(Project::class.java)) {
                _,
                method,
                args ->
                when (method.name) {
                    "isDisposed" -> disposed
                    "getService" -> error("Editor release must never create a service")
                    "getServiceIfCreated" -> {
                        serviceLookups++
                        if (disposeDuringLookup) disposed = true
                        existingService
                    }
                    else -> method.invoke(project, *(args ?: emptyArray()))
                }
            } as Project
        val editor =
            Proxy.newProxyInstance(Editor::class.java.classLoader, arrayOf(Editor::class.java)) {
                _,
                method,
                args ->
                if (method.name == "getProject") editorProject
                else method.invoke(myFixture.editor, *(args ?: emptyArray()))
            } as Editor
        NxEditorListener().editorReleased(EditorFactoryEvent(EditorFactory.getInstance(), editor))
    }
}
