package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.model.LockSemantics
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.isPluginLoaded
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.singleProject
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes

@Remote("com.intellij.openapi.project.ProjectManager")
interface EditorDisposalProjectManager {
    fun getInstance(): EditorDisposalProjectManager

    fun createProject(name: String, path: String): Project?

    fun closeAndDispose(project: Project): Boolean
}

@Remote("com.intellij.openapi.editor.EditorFactory")
interface EditorDisposalEditorFactory {
    fun getInstance(): EditorDisposalEditorFactory

    fun createDocument(text: String): EditorDisposalDocument

    fun createEditor(document: EditorDisposalDocument, project: Project): EditorDisposalEditor

    fun releaseEditor(editor: EditorDisposalEditor)
}

@Remote("com.intellij.openapi.editor.Document") interface EditorDisposalDocument

@Remote("com.intellij.openapi.editor.Editor")
interface EditorDisposalEditor {
    fun isDisposed(): Boolean
}

@Remote("com.intellij.openapi.editor.event.EditorFactoryEvent") interface EditorDisposalEvent

@Remote("dev.nx.console.listeners.NxEditorListener", plugin = "dev.nx.console")
interface EditorDisposalListener {
    fun editorReleased(event: EditorDisposalEvent)
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface EditorDisposalFileSystem {
    fun getInstance(): EditorDisposalFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    check(isPluginLoaded("dev.nx.console")) { "Nx Console must be loaded before this reproduction" }
    val project = singleProject()
    val evidence = Path.of(project.getBasePath(), "editor-disposal-diagnostic.txt")
    val temporaryProjectPath = Files.createTempDirectory("nx-editor-disposal-")
    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "editor-disposal") {
        var phase = "Creating a temporary project"
        val result = runCatching {
            val manager = utility<EditorDisposalProjectManager>().getInstance()
            val disposableProject =
                withContext(OnDispatcher.DEFAULT, LockSemantics.NO_LOCK) {
                    checkNotNull(
                        manager.createProject("Editor disposal", temporaryProjectPath.toString())
                    )
                }
            val factory = utility<EditorDisposalEditorFactory>().getInstance()
            phase = "Creating a temporary editor"
            val editor =
                withContext(OnDispatcher.EDT, LockSemantics.WRITE_ACTION) {
                    factory.createEditor(
                        factory.createDocument("Editor teardown diagnostic"),
                        disposableProject,
                    )
                }
            val event = new(EditorDisposalEvent::class, factory, editor)
            try {
                phase = "Disposing the temporary project"
                withContext(OnDispatcher.EDT, LockSemantics.NO_LOCK) {
                    check(manager.closeAndDispose(disposableProject)) {
                        "Temporary project was not disposed"
                    }
                }
                phase = "NxEditorListener.editorReleased after project disposal"
                withContext(OnDispatcher.EDT, LockSemantics.NO_LOCK) {
                    new(EditorDisposalListener::class).editorReleased(event)
                }
            } finally {
                withContext(OnDispatcher.EDT, LockSemantics.WRITE_ACTION) {
                    if (!editor.isDisposed()) factory.releaseEditor(editor)
                }
            }
        }
        val failure =
            result.exceptionOrNull()?.let { generateSequence(it) { error -> error.cause }.last() }
        val report =
            "Editor release after project disposal: actual IDE callback diagnostic\n\n" +
                "IDE: ${getProductVersion()}\n" +
                "A temporary project and editor are created with platform APIs.\n" +
                "The project is disposed, then NxEditorListener receives editorReleased.\n\n" +
                "Phase: $phase\n" +
                "Result: ${if (result.isSuccess) "PASS" else "FAIL"}\n" +
                "Error: ${failure?.let { "${it.javaClass.name}: ${it.message}" } ?: "none"}\n"
        println(report)
        evidence.writeText(report)
        utility<EditorDisposalFileSystem>()
            .getInstance()
            .refreshAndFindFileByPath(evidence.toString())
        openFile(evidence.fileName.toString())
        Thread.sleep(4000)
        result.getOrThrow()
    }
}
