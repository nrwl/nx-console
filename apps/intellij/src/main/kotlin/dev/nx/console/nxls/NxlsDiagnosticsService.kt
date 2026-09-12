package dev.nx.console.nxls

import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.runReadAction
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.psi.PsiManager
import java.util.concurrent.ConcurrentHashMap
import org.eclipse.lsp4j.Diagnostic

/**
 * Holds the diagnostics nxls publishes for the Nx configuration files, keyed by the same file url
 * the client sends in `textDocument/didOpen`. [NxlsDiagnosticsAnnotator] renders them.
 */
@Service(Service.Level.PROJECT)
class NxlsDiagnosticsService(private val project: Project) {

    private val diagnosticsByUrl = ConcurrentHashMap<String, List<Diagnostic>>()

    fun setDiagnostics(url: String, diagnostics: List<Diagnostic>) {
        if (diagnostics.isEmpty()) {
            if (diagnosticsByUrl.remove(url) == null) {
                return
            }
        } else {
            if (diagnosticsByUrl.put(url, diagnostics) == diagnostics) {
                return
            }
        }
        rerunHighlighting(url)
    }

    fun diagnosticsFor(file: VirtualFile): List<Diagnostic> =
        diagnosticsByUrl[file.url] ?: emptyList()

    private fun rerunHighlighting(url: String) {
        ApplicationManager.getApplication().invokeLater {
            if (project.isDisposed) {
                return@invokeLater
            }
            val file = VirtualFileManager.getInstance().findFileByUrl(url) ?: return@invokeLater
            val psiFile =
                runReadAction { PsiManager.getInstance(project).findFile(file) }
                    ?: return@invokeLater
            DaemonCodeAnalyzer.getInstance(project).restart(psiFile)
        }
    }

    companion object {
        fun getInstance(project: Project): NxlsDiagnosticsService =
            project.getService(NxlsDiagnosticsService::class.java)
    }
}
