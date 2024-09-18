package dev.nx.console.ide

import com.intellij.analysis.problemsView.FileProblem
import com.intellij.analysis.problemsView.Problem
import com.intellij.analysis.problemsView.ProblemsCollector
import com.intellij.analysis.problemsView.ProblemsProvider
import com.intellij.codeInsight.daemon.impl.HighlightInfo
import com.intellij.codeInsight.daemon.impl.HighlightInfo.newHighlightInfo
import com.intellij.codeInsight.daemon.impl.HighlightInfoType
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFileManager
import dev.nx.console.models.NxError
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.nxBasePath
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

@Service(Service.Level.PROJECT)
class ProjectGraphErrorProblemProvider(val project: Project, val cs: CoroutineScope) {
    private val nxProblemsProvider = NxProblemsProvider(project)
    private val problemsCollector = ProblemsCollector.getInstance(project)

    val mutex = Mutex()

    private val problems = mutableListOf<Problem>()

    fun init() {
        setNxProblems()
        project.messageBus
            .connect()
            .subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { setNxProblems() },
            )
    }

    private fun setNxProblems() {
        cs.launch {
            val nxWorkspace = NxlsService.getInstance(project).workspace()
            val newProblems =
                nxWorkspace?.errors?.let {
                    nxWorkspace.errors.mapNotNull { error -> nxErrorToFileProblem(error) }
                }

            problems.forEach { problemsCollector.problemDisappeared(it) }
            newProblems?.forEach { problemsCollector.problemAppeared(it) }

            mutex.withLock {
                problems.clear()
                problems.addAll(newProblems ?: emptyList())
            }
        }
    }

    private fun nxErrorToFileProblem(error: NxError): FileProblem? {
        val file =
            error.file?.let {
                VirtualFileManager.getInstance()
                    .findFileByNioPath(File(project.nxBasePath, error.file).toPath())
            }
        val nxJsonFile =
            VirtualFileManager.getInstance()
                .findFileByNioPath(File(project.nxBasePath, "nx.json").toPath())
                ?: return null

        val description =
            buildHtmlFromDescription((if (error.name != null) error.message else error.stack) ?: "")
        return object : FileProblem {
            override val provider = nxProblemsProvider
            override val text = error.name ?: error.message ?: "Nx Error"
            override val group = "Nx Errors"
            override val description = description
            override val file = file ?: nxJsonFile
            override val line = 1
            override val column = 1

            fun getInfo(): HighlightInfo {
                return newHighlightInfo(HighlightInfoType.ERROR)
                    .escapedToolTip(description)
                    .range(1, 1)
                    .createUnconditionally()
            }
        }
    }

    private fun buildHtmlFromDescription(description: String): String {
        return "<pre>$description</pre>"
    }

    companion object {
        fun getInstance(project: Project): ProjectGraphErrorProblemProvider {
            return project.getService(ProjectGraphErrorProblemProvider::class.java)
        }
    }
}

// empty class because ProblemsCollector needs ProblemsProvider instance
class NxProblemsProvider(override val project: Project) : ProblemsProvider {}
